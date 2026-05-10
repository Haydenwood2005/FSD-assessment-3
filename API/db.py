#Connects MySQL database to FASTAPI, integrating it with VSCode

import mysql.connector #imports the data from MySQL workbench database to the FASTAPI
from mysql.connector import Error


def get_connection(): #gets the connection for the database using passwords written in MySQL. 
    try:
        connection = mysql.connector.connect(
            host="localhost",
            port=3306,
            user="officer_user", #officers username 
            password="OfficerPass123", #officers password
            database="correctionnoticedb" #database name
        )
        return connection

    except Error as e: #if the connection to the database fails. Can be from incorrect username/password or other factors.
        print("Database connection error:", e)
        return None
