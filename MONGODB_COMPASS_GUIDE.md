# MongoDB Compass - How to View Your Account Data

## Your Account Information
- **Email:** coderew6456@gmail.com
- **Username:** coder645rw6
- **Database:** emotion_ai
- **Collection:** users
- **Status:** ✅ Successfully created and stored in MongoDB

---

## Step-by-Step Instructions

### Step 1: Look at the Left Sidebar
In MongoDB Compass, you should see a list of databases on the left side.

### Step 2: Find `emotion_ai` Database
Scroll down in the databases list and look for `emotion_ai`. Click on it to expand.

**You should see:**
```
localhost:27017
├── admin
├── config
├── local
├── emotion_ai  ← Click here
├── netflix-clone
└── ...
```

### Step 3: Expand emotion_ai
Once you click `emotion_ai`, you'll see a list of collections:

```
emotion_ai
├── media
├── settings
├── alerts
├── users  ← Click here to see your account
└── emotions
```

### Step 4: Click on `users` Collection
This is where your account data is stored. You should see:

- **Email:** coderew6456@gmail.com
- **Username:** coder645rw6
- **Password Hash:** (bcrypt hashed)
- **Created At:** 2026-04-18 10:09:45
- **Guardian Emails:** []

---

## MongoDB Database Structure

```
emotion_ai (Database)
├── users (Collection) - User accounts
│   ├── email
│   ├── username
│   ├── password_hash
│   ├── created_at
│   └── guardian_emails
│
├── settings (Collection) - User preferences (3 documents)
│
├── emotions (Collection) - Emotion history
│
├── alerts (Collection) - Guardian alerts
│
└── media (Collection) - Uploaded files
```

---

## If You Still Don't See It

Try refreshing MongoDB Compass:
1. Press **F5** or click the refresh button
2. Disconnect and reconnect to localhost:27017
3. Check the database name is exactly `emotion_ai` (case-sensitive)

---

## Verify Via Command Line

Run this command to confirm your account exists:

```bash
python -c "
from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017/')
db = client['emotion_ai']
user = db['users'].find_one({'email': 'coderew6456@gmail.com'})
if user:
    print('✅ Account Found!')
    print(f'Email: {user[\"email\"]}')
    print(f'Username: {user[\"username\"]}')
else:
    print('❌ Account not found')
"
```

---

## Summary

Your account **has been successfully created** and is stored in:
- **Database:** emotion_ai
- **Collection:** users
- **Email:** coderew6456@gmail.com
- **Username:** coder645rw6

Just navigate to the correct location in MongoDB Compass using the steps above!
