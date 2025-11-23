# 🚀 404ping

![404ping](./src/config/404ping.png)

**Lightweight API testing CLI — curl with a brain**

Stop wrestling with Postman's bloat or forgetting your curl flags. 404ping gives you the power of a full API client in a blazing-fast CLI with variables, collections, and saved requests.

---

## Why 404ping?

| Feature | curl | Postman | 404ping |
|---------|------|---------|---------|
| Lightweight | ✅ | ❌ | ✅ |
| Variables | ❌ | ✅ | ✅ |
| Collections | ❌ | ✅ | ✅ |
| Save & Reuse Requests | ❌ | ✅ | ✅ |
| No GUI Required | ✅ | ❌ | ✅ |
| Fast Startup | ✅ | ❌ | ✅ |

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/toklas495/404ping.git
cd 404ping

# Install dependencies
npm install

# Build and link globally
npm run build
```

Now you can use `404ping` from anywhere in your terminal!

---

## 🎯 Quick Start

```bash
# Simple GET request
404ping request https://api.example.com/users

# POST with JSON body
404ping request https://api.example.com/login -X POST -d '{"email":"test@example.com","password":"secret"}'

# With custom headers
404ping request https://api.example.com/me -H "Authorization: Bearer mytoken"
```

---

## 💡 Core Concepts

### 🔹 Global Variables

Set variables once, use them everywhere with `{{variable}}` syntax.

```bash
# Set variables globally
404ping set host:https://api.myapp.com token:abc123 -g

# Use in requests
404ping request {{host}}/users/me -H "Authorization: Bearer {{token}}"

# List all variables
404ping vars

# Remove variables
404ping unset host token
```

### 🔹 Collections

Group related requests together — perfect for organizing APIs by project or feature.

```bash
# Create a collection
404ping collection create myapp

# Save a request to collection
404ping collection save myapp login -X POST {{host}}/auth/login -d '{"email":"{{email}}","password":"{{pass}}"}'

# Save another request
404ping collection save myapp get-profile {{host}}/users/me -H "Authorization: Bearer {{token}}"

# List all collections
404ping collection list

# Show requests in a collection
404ping collection show myapp
```

### 🔹 Run Saved Requests

Execute saved requests instantly with `run` command.

```bash
# Run a saved request
404ping run myapp:login

# Override URL temporarily (doesn't save)
404ping run myapp:login -u "https://staging.myapp.com/auth/login"

# Override and SAVE the changes
404ping run myapp:login -u "https://newapi.myapp.com/auth/login" --save

# Override method, headers, or body
404ping run myapp:get-profile -H "Authorization: Bearer newtoken"
```

### 🔹 Collection Variables

Use collection-scoped variables with `{{collection.variable}}` syntax.

```bash
# Reference variables from a specific collection
404ping request {{myapp.host}}/api/v1/users
```

---

## 📖 Command Reference

### `request <url>`

Send HTTP requests.

| Option | Alias | Description |
|--------|-------|-------------|
| `--method` | `-X` | HTTP method (GET, POST, PUT, DELETE) |
| `--data` | `-d` | JSON request body |
| `--header` | `-H` | Custom headers (repeatable) |
| `--s_header` | `-i` | Show response headers |
| `--size` | | Show response size in bytes |
| `--raw` | | Output raw response body |
| `--info` | | Show request summary |
| `--debug` | | Full request/response dump |

```bash
404ping request https://api.example.com/posts -X POST \
  -d '{"title":"Hello","body":"World"}' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{token}}" \
  --info
```

### `set <variables..>`

Set one or more variables.

| Option | Alias | Description |
|--------|-------|-------------|
| `--global` | `-g` | Save variables globally |

```bash
404ping set host:https://api.prod.com env:production -g
```

### `unset <variables..>`

Remove variables.

```bash
404ping unset host token env
```

### `vars`

List all saved variables.

```bash
404ping vars
```

### `collection <action> [name] [request]`

Manage collections.

| Action | Description |
|--------|-------------|
| `create` | Create a new collection |
| `save` | Save a request to collection |
| `list` | List all collections |
| `show` | Show requests in a collection |

```bash
# Create
404ping collection create github-api

# Save request
404ping collection save github-api repos {{github_host}}/user/repos \
  -H "Authorization: token {{github_token}}"

# List collections
404ping collection list

# Show collection details
404ping collection show github-api
```

### `run <collection:request>`

Run a saved request from a collection.

| Option | Alias | Description |
|--------|-------|-------------|
| `--url` | `-u` | Override URL |
| `--method` | `-X` | Override HTTP method |
| `--data` | `-d` | Override request body |
| `--header` | `-H` | Override/add headers |
| `--save` | | Save overrides permanently |
| `--s_header` | `-i` | Show response headers |
| `--raw` | | Output raw response |
| `--info` | | Show summary |
| `--debug` | | Full dump |

```bash
# Basic run
404ping run myapp:login

# Override without saving
404ping run myapp:login -u "https://staging.api.com/login"

# Override AND save
404ping run myapp:login -d '{"email":"new@email.com"}' --save
```

---

## 🔥 Real-World Workflow

```bash
# 1. Setup your environment
404ping set host:https://api.myapp.com -g

# 2. Create a collection for your project
404ping collection create myapp

# 3. Save your login request
404ping collection save myapp login -X POST {{host}}/auth/login \
  -d '{"email":"dev@myapp.com","password":"secret123"}'

# 4. Run it anytime
404ping run myapp:login

# 5. Got a token? Save it!
404ping set token:eyJhbGciOiJIUzI1NiIs... -g

# 6. Save authenticated requests
404ping collection save myapp profile {{host}}/users/me \
  -H "Authorization: Bearer {{token}}"

# 7. Test your API in seconds
404ping run myapp:profile --info
```

---

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Build for global usage
npm run build
```

---

## 📄 License

MIT © [toklas495](https://github.com/toklas495)

---

<p align="center">
  <b>404ping</b> — Because life's too short for heavy API clients 🏃‍♂️💨
</p>