# Contracting Company ERP System

## Overview

This project is a comprehensive, cloud-native ERP and project management system designed for a specialized contracting company. This initial version provides the foundational slice of the application, including a backend authentication service and a frontend interface for user registration and login.

The application is built using a microservices architecture and is fully containerized with Docker for easy setup and deployment.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

## Setup and Configuration

1.  **Clone the Repository:**
    If you have this project in a Git repository, clone it first.
    ```bash
    # git clone <repository-url>
    # cd <repository-directory>
    ```

2.  **Create an Environment File:**
    This project uses an `.env` file to manage sensitive information for the backend services. Create a file named `.env` in the root of the project directory.

    On Linux/macOS:
    ```bash
    touch .env
    ```
    On Windows, you can create it manually or use:
    ```bash
    echo. > .env
    ```

    Open the `.env` file and add the following line. **It is critical that you replace the placeholder with a strong, unique secret key.** You can generate one using a password manager or an online generator.
    ```
    SECRET_KEY=your_super_secret_key_that_is_at_least_32_characters_long
    ```
    This key is used for signing the JSON Web Tokens (JWTs) for authentication.

## Running the Application

Once the setup is complete, you can launch the entire application stack with a single command from the project root directory:

```bash
docker-compose up --build
```

This command will:
- Build the Docker images for the `auth` and `frontend` services if they don't exist.
- Start containers for the PostgreSQL database, the backend `auth` service, and the frontend application.
- You will see logs from all services in your terminal.

To run the containers in the background (detached mode), use the `-d` flag:
```bash
docker-compose up --build -d
```

## How to Use

-   **Frontend Application:**
    Open your web browser and navigate to `http://localhost:3000`.

-   **User Registration:**
    Use the "Register" form to create a new user. You can choose a role from the dropdown (e.g., `admin`, `engineer`).

-   **User Login:**
    After successful registration, use the "Login" form with the credentials you just created. A successful login will store a JWT token in your browser's local storage.

-   **Backend Service:**
    The `auth` service API is running and accessible on your host machine at `http://localhost:8001`.

## Next Steps

The current version is just the beginning. The next steps in the development plan include:
- Implementing the `projects` microservice.
- Building out the frontend dashboard and project management views.
- Adding more core modules like HR and Accounting.
- Integrating the AI and Computer Vision features.
---
