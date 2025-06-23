# 🪜 LadLadder

**LadLadder** is a Jackbox-style multiplayer party game where players create and answer questions about their friends, assign personality traits, rank each other, and climb the ladder of social perception. Points are awarded based on consensus, modesty, and character-driven bonuses.

---

## 🧰 Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white&style=for-the-badge)
![Express](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white&style=for-the-badge)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socket.io&logoColor=white&style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white&style=for-the-badge)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?logo=mongoose&logoColor=white&style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black&style=for-the-badge)
![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white&style=for-the-badge)
![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white&style=for-the-badge)
![AWS EC2](https://img.shields.io/badge/AWS_EC2-FF9900?logo=amazon-aws&logoColor=white&style=for-the-badge)
![PM2](https://img.shields.io/badge/PM2-2B037A?logo=pm2&logoColor=white&style=for-the-badge)

---

## 🕹️ How the Game Works

1. **Host Creates a Game**  
   A host creates a game session. A unique game code is generated.

2. **Players Join via Socket.IO**  
   Other players join using the game code. All connections are handled in real-time using WebSockets.

3. **Question Phase**  
   Each player submits creative or funny questions about the group. Every question is assigned a character attribute (e.g., loyalty, ambition).

4. **Ranking Phase**  
   Players rank themselves and each other in response to the questions — for example, “Who’s most likely to get married?”

5. **Scoring**  
   - Points are distributed based on how well a player’s rankings align with the group’s.
   - Bonus points are awarded for:
     - **Character Attributes**
     - **Modesty** (if a player ranks themselves close to the group’s consensus)

6. **Game End**  
   The player with the highest score after all questions and bonus rounds wins!

---

## 🛠️ Local Setup

Follow these steps to get LadLadder running locally:

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ladladder.git
cd ladladder
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
PORT=3000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ladladder
NODE_ENV=development
```

> Replace `<username>` and `<password>` with your actual MongoDB Atlas credentials.

### 4. Start the server

```bash
npm start
```

### 5. Open the app

Visit:

```
http://localhost:3000
```

or whatever port you defined in your `.env`.


```env
PORT=3000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ladladder
NODE_ENV=development
```


