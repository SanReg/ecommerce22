DATABASE BACKUP AND RESTORE:
mongodump --uri="mongodb+srv://creativesantoshus:gwKJIn10QyJUwLE5@cluster0.vrobsgb.mongodb.net/backedupDB" --out=./backup

mongorestore --uri="mongodb+srv://creativesantoshus:gwKJIn10QyJUwLE5@cluster0.vrobsgb.mongodb.net" --db=new_dbname "C:\Users\Santosh\backup\backedupDB"
