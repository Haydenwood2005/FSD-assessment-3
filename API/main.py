# Connects VSCode to FASTAPI, allowing this code to be a working API

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer #this allows a JWT to be given through the auth instead of /token
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from db import get_connection

app = FastAPI(title="Correction Notice API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT SETTINGS

SECRET_KEY = "my_secret_key_123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Hardcoded users for assignment

users = {
    "officer_user": {"password": "OfficerPass123", "role": "officer"}, #has access to all 4 types of endpoints, can edit the data for issuing notices etc
    "citizen_user": {"password": "CitizenPass123", "role": "citizen"}
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") #by using this, the user can authorise in the top right of fastapi without needing the token first, as the JWT will be called automatically

#use officer username and password to call JWT and authorise, allowing use of other endpoints without needing to go into /token first

# TOKEN FUNCTIONS

def create_access_token(data: dict, expires_delta: timedelta | None = None): #Creates a JWT token with an expiration
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)): #Reads the Bearer token from Swagger Authorize button. Decodes the JWT and returns the user dictionary
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")

        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token (missing username)")

        # Officer login
        if username == "officer_user":
            return {
                "username": username,
                "role": "officer"
            }

        # Citizen login from database
        connection = get_connection()

        if connection is None:
            raise HTTPException(status_code=500, detail="Database connection failed")

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM users WHERE username = %s",
            (username,)
        )

        user = cursor.fetchone()

        cursor.close()
        connection.close()

        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return {
            "username": username,
            "role": user["role"]
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def officer_only(current_user: dict = Depends(get_current_user)): #Only allows officers to edit (POST/PUT/DELETE)
    if current_user["role"] != "officer":
        raise HTTPException(status_code=403, detail="Access denied: officer role required")
    return current_user


#Root endpoint - checks to see if api is running when app is checked without /docs or other strings

@app.get("/")
def root():
    return {"message": "API is running"}



#Pydantic models - used for PUT and POST endpoints to allow editing of data


class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    date_of_birth: str
    email: str
    phone: str
    licence_number: str
    vehicle_registration: str


class DriverCreate(BaseModel): #allows officer to add a driver to the data to allow an issuing of a notice to them.
    First_Name: str
    Last_Name: str
    Address: str
    City: str | None = None
    State: str
    Postal_Code: str | None = None
    Drivers_Licence_Number: str
    Drivers_Licence_Issued_State: str
    Date_Of_Birth: str
    Height: str
    Weight: int
    Eyes_Colour: str


class DriverUpdate(BaseModel): #allows an officer to update a drivers personal information incase it changes. could move house or get new number etc
    Address: str | None = None
    City: str | None = None
    State: str | None = None
    Postal_Code: str | None = None
    Height: str | None = None
    Weight: int | None = None
    Eyes_Colour: str | None = None


class NoticeCreate(BaseModel): #allows an officer to issue a notice to a driver
    OfficerID: int
    VehicleID: int | None = None
    ViolationTypesID: int
    Violation_Date: str
    Violation_Time: str
    Violation_Street: str
    Violation_City: str
    Violation_District: str
    Violation_Detachment: str


class NoticeUpdateFull(BaseModel): #allows an officer to update a notice entirely, editing any part that may need to be changed
    OfficerID: int | None = None
    VehicleID: int | None = None
    ViolationTypesID: int | None = None
    Violation_Date: str | None = None
    Violation_Time: str | None = None
    Violation_Street: str | None = None
    Violation_City: str | None = None
    Violation_District: str | None = None
    Violation_Detachment: str | None = None


class NoticeUpdateLocation(BaseModel): #allows an officer to update a specific part of a notice, as incorrect data could be inputted at the time
    Violation_Street: str | None = None
    Violation_City: str | None = None
    Violation_District: str | None = None
    Violation_Detachment: str | None = None



# GET ENDPOINTS 


# GET 1 - no parameter - search all violation types
@app.get("/violations")
def get_violations():
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed") #for all endpoints, shows error 500 if connection failed

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM ViolationTypes;") #searches and retrieves all data from VTypes
        return cursor.fetchall()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


# GET 2 - parameter - search notices for specific driver
@app.get("/drivers/{driver_id}/notices")
def get_driver_notices(driver_id: int):
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try: #retrieve this information from inserted driver ID
        sql = """
        SELECT 
            d.DriverID,
            d.First_Name AS Driver_First_Name,
            d.Last_Name AS Driver_Last_Name,

            n.NoticeID,
            n.Violation_Date,
            n.Violation_Time,
            n.Violation_Street,
            n.Violation_City,
            n.Violation_District,
            n.Violation_Detachment,

            vt.Violation_Code,
            vt.Violation_Name,

            o.OfficerID,
            o.Personnel_Number,
            o.First_Name AS Officer_First_Name,
            o.Last_Name AS Officer_Last_Name

        FROM Notice n
        JOIN Driver d ON n.DriverID = d.DriverID
        JOIN ViolationTypes vt ON n.ViolationTypesID = vt.ViolationTypesID
        JOIN Officer o ON n.OfficerID = o.OfficerID
        WHERE n.DriverID = %s;
        """

        cursor.execute(sql, (driver_id,))
        rows = cursor.fetchall() #fetch all data from inputted ID

        if not rows:
            raise HTTPException(status_code=404, detail=f"No notices found for DriverID {driver_id}") #error 404 when no results for what was searched

        return rows #return the information to show the user

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


# GET 3 - parameter - searching number plate for specific info on that car
@app.get("/vehicles/search")
def search_vehicle_by_plate(plate: str = Query(..., min_length=1)): #insert a reg plate. minimum 1 so cant be empty 
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try: #search info based off reg plate
        sql = """
        SELECT
            v.VehicleID,
            v.Vehicles_Licence_Number,
            v.Color,
            v.Make,
            v.VIN,
            v.Vehicles_Licence_State,
            v.Year,
            v.Type,
            ro.OwnerID,
            ro.First_Name AS Owner_First_Name,
            ro.Last_Name AS Owner_Last_Name,
            ro.Address AS Owner_Address,
            ro.City AS Owner_City,
            ro.State AS Owner_State,
            ro.Postal_Code AS Owner_Postal_Code,
            ro.Phone,
            ro.Email
        FROM Vehicle v
        JOIN RegisteredOwner ro ON v.OwnerID = ro.OwnerID
        WHERE v.Vehicles_Licence_Number = %s;
        """

        cursor.execute(sql, (plate,))
        row = cursor.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail=f"No vehicle found with plate '{plate}'")

        return row

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


# POST ENDPOINTS 


# POST 1 - insert a driver into the data - JWT is rewuired to do so
@app.post("/drivers")
def create_driver(driver: DriverCreate, current_user: dict = Depends(officer_only)):
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try:
        sql = """
        INSERT INTO Driver
        (First_Name, Last_Name, Address, City, State, Postal_Code,
         Drivers_Licence_Number, Drivers_Licence_Issued_State,
         Date_Of_Birth, Height, Weight, Eyes_Colour)
        VALUES
        (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
        """

        values = ( #asksuser to input this data to add driver to the data
            driver.First_Name,
            driver.Last_Name,
            driver.Address,
            driver.City,
            driver.State,
            driver.Postal_Code,
            driver.Drivers_Licence_Number,
            driver.Drivers_Licence_Issued_State,
            driver.Date_Of_Birth,
            driver.Height,
            driver.Weight,
            driver.Eyes_Colour
        )

        cursor.execute(sql, values)
        connection.commit()

        return {"message": "Driver created successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) #error code 500 if driver was not created successfully into data

    finally:
        cursor.close()
        connection.close()


# POST 2 - insert a notice for a specific driver - JWT is required to do so
@app.post("/drivers/{driver_id}/notices")
def create_notice_for_driver(driver_id: int, notice: NoticeCreate, current_user: dict = Depends(officer_only)):
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try:
        sql = """
        INSERT INTO Notice
        (NoticeID, OfficerID, VehicleID, DriverID, ViolationTypesID,
         Violation_Date, Violation_Time, Violation_Street, Violation_City,
         Violation_District, Violation_Detachment)
        VALUES
        (UUID(), %s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
        """

        values = (
            notice.OfficerID,
            notice.VehicleID,
            driver_id,
            notice.ViolationTypesID,
            notice.Violation_Date,
            notice.Violation_Time,
            notice.Violation_Street,
            notice.Violation_City,
            notice.Violation_District,
            notice.Violation_Detachment
        )

        cursor.execute(sql, values)
        connection.commit()

        return {"message": "Notice created successfully", "DriverID": driver_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


# POST 3 - /token - creates JWT when username and password entered into authorisation for allowing access to edit data.
@app.post("/token")
def token_post(form_data: OAuth2PasswordRequestForm = Depends()):

    username = form_data.username
    password = form_data.password

    # Officer login
    if username == "officer_user" and password == "OfficerPass123":

        access_token = create_access_token(
            data={
                "sub": username,
                "role": "officer"
            }
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": "officer"
        }

    # Citizen login from database
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            "SELECT * FROM users WHERE username = %s",
            (username,)
        )

        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )

        if user["password"] != password:
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )

        access_token = create_access_token(
            data={
                "sub": username,
                "role": "citizen"
            }
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": "citizen"
        }

    finally:
        cursor.close()
        connection.close()


# PUT ENDPOINTS


# PUT 1 - update a drivers personal information - JWT is required to do so
@app.put("/drivers/{driver_id}")
def update_driver(driver_id: int, driver: DriverUpdate, current_user: dict = Depends(officer_only)):
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try:
        fields = []
        values = []

        for field, value in driver.model_dump(exclude_unset=True).items():
            fields.append(f"{field}=%s")
            values.append(value)

        if not fields:
            raise HTTPException(status_code=400, detail="No data provided to update")

        values.append(driver_id)

        sql = f"UPDATE Driver SET {', '.join(fields)} WHERE DriverID=%s;"
        cursor.execute(sql, tuple(values))
        connection.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"DriverID {driver_id} not found")

        return {"message": f"Driver {driver_id} updated successfully"}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


# PUT 2 - update a specific section of a notice - edit a notices location - JWT is required to do so
@app.put("/notices/{notice_id}/location")
def update_notice_location(notice_id: str, notice: NoticeUpdateLocation, current_user: dict = Depends(officer_only)):
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try:
        fields = []
        values = []

        for field, value in notice.model_dump(exclude_unset=True).items():
            fields.append(f"{field}=%s")
            values.append(value)

        if not fields:
            raise HTTPException(status_code=400, detail="No location fields provided")

        values.append(notice_id)

        sql = f"UPDATE Notice SET {', '.join(fields)} WHERE NoticeID=%s;"
        cursor.execute(sql, tuple(values))
        connection.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"NoticeID {notice_id} not found")

        return {"message": f"Notice {notice_id} location updated successfully"}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


# PUT 3 - /token - creates JWT when username and password entered into authorisation for allowing access to edit data.
@app.put("/token")
def token_put(form_data: OAuth2PasswordRequestForm = Depends()): #same as POST /token
    username = form_data.username
    password = form_data.password

    user = users.get(username)
    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": username, "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}


# DELETE ENDPOINTS 


# DELETE 1 - delete a notice - JWT is required to do so
@app.delete("/notices/{notice_id}")
def delete_notice(notice_id: str, current_user: dict = Depends(officer_only)):
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor()

    try:
        cursor.execute("DELETE FROM Notice WHERE NoticeID=%s;", (notice_id,)) #delete notice where a notice is present. 
        connection.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"NoticeID {notice_id} not found")

        return {"message": f"Notice {notice_id} deleted successfully"}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


# DELETE 2 - delete an owner from a vehicles info - JWT is required to do so
@app.delete("/vehicles/{vehicle_id}/remove-owner")
def remove_owner_from_vehicle(vehicle_id: int, current_user: dict = Depends(officer_only)):
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor()

    try:
        sql = "UPDATE Vehicle SET OwnerID=NULL WHERE VehicleID=%s;" #change vehicle from a specific ID to zero. essentially delete by just inputting it as zero
        cursor.execute(sql, (vehicle_id,))
        connection.commit()

        if cursor.rowcount == 0: #if no vehicle found it cant delete it
            raise HTTPException(status_code=404, detail=f"VehicleID {vehicle_id} not found")

        return {"message": f"Owner removed from Vehicle {vehicle_id} successfully"}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


# DELETE 3 - /token - creates JWT when username and password entered into authorisation for allowing access to edit data.
@app.delete("/token")
def token_delete(form_data: OAuth2PasswordRequestForm = Depends()): #same as POST /token
    username = form_data.username
    password = form_data.password

    user = users.get(username)
    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": username, "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/register")
def register_user(user: UserRegister):

    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            "SELECT * FROM users WHERE username = %s",
            (user.username,)
        )

        existing_user = cursor.fetchone()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )

        sql = """
        INSERT INTO users
        (
            username,
            password,
            full_name,
            date_of_birth,
            email,
            phone,
            licence_number,
            vehicle_registration,
            role
        )
        VALUES
        (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """

        values = (
            user.username,
            user.password,
            user.full_name,
            user.date_of_birth,
            user.email,
            user.phone,
            user.licence_number,
            user.vehicle_registration,
            "citizen"
        )

        cursor.execute(sql, values)
        connection.commit()

        return {
            "message": "User registered successfully"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()


@app.get("/users")
def get_all_users():
    connection = get_connection()

    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                username,
                password,
                full_name,
                email,
                phone,
                licence_number,
                vehicle_registration,
                role
            FROM users;
        """)

        return cursor.fetchall()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        connection.close()



@app.get("/admin/stats/total-citations")
def get_total_citations(current_user: dict = Depends(officer_only)):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT COUNT(*) AS total_citations FROM Notice;")
        return cursor.fetchone()

    finally:
        cursor.close()
        connection.close()


@app.get("/admin/stats/by-violation")
def get_citations_by_violation(current_user: dict = Depends(officer_only)):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                vt.Violation_Name,
                COUNT(*) AS total
            FROM Notice n
            JOIN ViolationTypes vt 
            ON n.ViolationTypesID = vt.ViolationTypesID
            GROUP BY vt.Violation_Name;
        """)
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


@app.get("/admin/stats/by-district")
def get_citations_by_district(current_user: dict = Depends(officer_only)):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                Violation_District,
                COUNT(*) AS total
            FROM Notice
            GROUP BY Violation_District;
        """)
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


@app.get("/admin/stats/by-detachment")
def get_citations_by_detachment(current_user: dict = Depends(officer_only)):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                Violation_Detachment,
                COUNT(*) AS total
            FROM Notice
            GROUP BY Violation_Detachment;
        """)
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()
