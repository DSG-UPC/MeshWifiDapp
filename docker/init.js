db.createUser({user: 'ammbr', pwd: '4mmBr_P4ssW0rd', roles: ["readWrite", "dbAdmin"]});
db.createCollection('devices');
db.createCollection('users');