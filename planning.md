# Adding new features


## 404ping request @login.http | @login.json  
    *this make 404ping awesome
###     JSON format
        {
            "url": "https://example.com/api/login",
            "method": "POST",
            "headers": {
              "Content-Type": "application/json",
              "X-Forwarded-For": "127.0.0.1"
            },
            "query": {
              "debug": "true",
              "version": "1.2"
            },
            "body": {
              "username": "admin",
              "password": "admin@123"
            },
            "cookies": {
              "session": "abc123",
              "token": "xyz789"
            },
            "timeout": 5000,
            "followRedirects": true
        }
    
###     HTTP format {login.http}

        POST https://example.com/api/login?debug=true

        Content-Type: application/json
        X-Forwarded-For: 127.0.0.1
        Cookie: session=abc123; token=xyz789

        {
          "username": "admin",
          "password": "admin@123"
        }




