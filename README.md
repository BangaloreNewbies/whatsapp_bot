# Whatsapp Bot using Node.js
Built using whatsapp-web.js and containerized using Docker.

## Features:
- Sends daily poll, pdf and remainders on a group.
- Welcomes users with a message specific to that group,  based on the group that user joins.
- Tag admins
- Admins can tag everyone present in the group (Members can not do this.)
- Add birthdays and update them
- View upcoming birthdays and birthdays of members in a specific month.
- Get birthday wishes at 12.00 AM

## How to run:
- Clone the repository, `npm i` followed by `npm start`
- Fill the environment variables with the format given in .env.example
- index.html will be available in localhost:3000

## Docker Image
- To make docker image `docker build -t <image-name>`
- To run `docker run -p 127.0.0.1:3000:3000 <image-name>` and index.html will be available in localhost:3000
