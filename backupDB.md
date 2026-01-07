DATABASE BACKUP AND RESTORE:
mongodump --uri=".../test" --out=./backup

mongorestore --uri="..." --db=newdatabase "C:\Users\Santosh\backup\olddatabase"
