# Backend Project

This is a backend project built with Node.js, Express, and MongoDB. It provides a set of APIs for a video-sharing platform, similar to YouTube, with features like user authentication, video management, comments, likes, subscriptions, playlists, and tweets.

## Features

*   **User Management:** User registration, login, logout, password change, and profile updates.
*   **Video Management:** Upload, watch, update, and delete videos.
*   **Comment Management:** Add, update, and delete comments on videos.
*   **Like Management:** Like or unlike videos, comments, and tweets.
*   **Subscription Management:** Subscribe to and unsubscribe from other users' channels.
*   **Playlist Management:** Create, update, and delete playlists, and add or remove videos from them.
*   **Tweet Management:** Create, update, and delete tweets.
*   **Dashboard:** View channel statistics, including total subscribers, total videos, and total views.

## Getting Started

### Prerequisites

*   Node.js (v18.x or higher)
*   npm (v9.x or higher)
*   MongoDB

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/your-username/your-repo-name.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd backend
    ```
3.  Install the dependencies:
    ```sh
    npm install
    ```
4.  Create a `.env` file in the root of the project and add the following environment variables:
    ```
    PORT=8000
    MONGODB_URI=your-mongodb-connection-string
    CORS_ORIGIN=*
    ACCESS_TOKEN_SECRET=your-access-token-secret
    ACCESS_TOKEN_EXPIRY=1d
    REFRESH_TOKEN_SECRET=your-refresh-token-secret
    REFRESH_TOKEN_EXPIRY=10d
    CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
    CLOUDINARY_API_KEY=your-cloudinary-api-key
    CLOUDINARY_API_SECRET=your-cloudinary-api-secret
    ```

## Usage

To run the application in development mode, use the following command:

```sh
npm run dev
```

This will start the server on the port specified in your `.env` file (default is 8000).

## API Endpoints

### Users (`/api/v1/users`)
-   `POST /register` - Register a new user.
-   `POST /login` - Login an existing user.
-   `POST /logout` - Logout a user.
-   `POST /refresh-token` - Refresh the access token.
-   `POST /change-password` - Change the password of the current user.
-   `GET /current-user` - Get the current user's details.
-   `PATCH /update-account-details` - Update the account details of the current user.
-   `PATCH /update-avatar` - Update the avatar of the current user.
-   `PATCH /update-cover-image` - Update the cover image of the current user.
-   `GET /user-channel-profile/:username` - Get the channel profile of a user.
-   `GET /watch-history` - Get the watch history of the current user.
-   `GET /search` - Search for channels.

### Videos (`/api/v1/videos`)
-   `GET /` - Get all videos.
-   `POST /publish` - Publish a new video.
-   `GET /:videoId` - Get a video by its ID.
-   `PATCH /:videoId` - Update a video's details.
-   `DELETE /:videoId` - Delete a video.
-   `PATCH /toggle-publish/:videoId` - Toggle the publish status of a video.

### Comments (`/api/v1/comments`)
-   `GET /:videoId` - Get all comments for a video.
-   `POST /:videoId` - Add a new comment to a video.
-   `DELETE /c/:commentId` - Delete a comment.
-   `PATCH /c/:commentId` - Update a comment.

### Likes (`/api/v1/likes`)
-   `PATCH /video-likes/:videoId` - Toggle a like on a video.
-   `PATCH /comment-likes/:commentId` - Toggle a like on a comment.
-   `PATCH /tweet-likes/:tweetId` - Toggle a like on a tweet.
-   `GET /liked-videos` - Get all liked videos.

### Subscriptions (`/api/v1/subscriptions`)
-   `GET /channel-subscribers/:channelId` - Get all subscribers for a channel.
-   `PATCH /channel-subscribers/:channelId` - Toggle a subscription to a channel.
-   `GET /subscribed-channels` - Get all channels the current user is subscribed to.

### Playlists (`/api/v1/playlists`)
-   `POST /` - Create a new playlist.
-   `GET /:playlistId` - Get a playlist by its ID.
-   `PATCH /:playlistId` - Update a playlist's details.
-   `DELETE /:playlistId` - Delete a playlist.
-   `PATCH /add/:videoId/:playlistId` - Add a video to a playlist.
-   `PATCH /remove/:videoId/:playlistId` - Remove a video from a playlist.
-   `GET /user/:userId` - Get all playlists for a user.

### Tweets (`/api/v1/tweets`)
-   `POST /` - Create a new tweet.
-   `GET /user-tweets` - Get all tweets for the current user.
-   `DELETE /:tweetId` - Delete a tweet.
-   `PATCH /:tweetId` - Update a tweet.

## Technologies Used

*   **Node.js:** A JavaScript runtime built on Chrome's V8 JavaScript engine.
*   **Express:** A fast, unopinionated, minimalist web framework for Node.js.
*   **MongoDB:** A cross-platform document-oriented database program.
*   **Mongoose:** An Object Data Modeling (ODM) library for MongoDB and Node.js.
*   **JWT (JSON Web Token):** A compact, URL-safe means of representing claims to be transferred between two parties.
*   **bcrypt:** A library for hashing passwords.
*   **Cloudinary:** A cloud-based service that provides an end-to-end image and video management solution.
*   **Multer:** A node.js middleware for handling `multipart/form-data`.
*   **Prettier:** An opinionated code formatter.
*   **Nodemon:** A tool that helps develop node.js based applications by automatically restarting the node application when file changes in the directory are detected.

## Project Structure

```
.
├── .env
├── .gitignore
├── .prettierignore
├── .prettierrc
├── package-lock.json
├── package.json
└── src
    ├── app.js
    ├── constants.js
    ├── index.js
    ├── controllers
    │   ├── comment.controller.js
    │   ├── like.controller.js
    │   ├── playlist.controller.js
    │   ├── subscription.controller.js
    │   ├── tweet.controller.js
    │   ├── user.controller.js
    │   └── video.controller.js
    ├── db
    │   └── index.js
    ├── middlewares
    │   ├── multer.middleware.js
    │   └── userAuth.middleware.js
    ├── models
    │   ├── comment.model.js
    │   ├── like.model.js
    │   ├── playlist.model.js
    │   ├── subscription.model.js
    │   ├── tweet.model.js
    │   ├── user.model.js
    │   └── video.model.js
    ├── routes
    │   ├── comment.routes.js
    │   ├── like.routes.js
    │   ├── playlist.routes.js
    │   ├── subscription.routes.js
    │   ├── tweet.routes.js
    │   ├── user.routes.js
    │   └── video.routes.js
    └── utils
        ├── ApiError.js
        ├── ApiResponse.js
        ├── asyncHandler.js
        └── cloudinary.js
```
