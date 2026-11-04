const fs = require("fs");
const http=require("http");
const crypto = require("crypto");
const host = 'localhost';
const port = 8090;
const server = http.createServer();


const { Client } = require('pg');

const client = new Client({
    user: 'appuser', 
    password: process.env.PGPASSWORD, 
    database: 'application_image',
    port : 22119
});

client.connect()
.then(() => {
    console.log('Connected to database');
})
.catch((e) => {
    console.log('Error connecting to database');
    console.log(e);
});

let lastSessionId = 0;
let sessions = [];

server.on("request", async (req, res) => {
    let hasCookieWithSessionId = false;
    let sessionId = undefined;
    if (req.headers['cookie'] !== undefined) {
        let sessionIdInCookie = req.headers['cookie'].split(';').find(item => item.trim().startsWith('session-id'));
        if (sessionIdInCookie !== undefined) {
            let sessionIdInt = parseInt(sessionIdInCookie.split('=')[1]);
            if (sessions[sessionIdInt]) {
                hasCookieWithSessionId = true;
                sessionId = sessionIdInt;
                sessions[sessionId].nbRequest++;
            }
        }
    }
    if (!hasCookieWithSessionId) {
        lastSessionId++;
        res.setHeader('Set-Cookie', `session-id=${lastSessionId}`);
        sessionId = lastSessionId;
        sessions[lastSessionId] = {
            'nbRequest': 0
        }
    }
    if (req.url === '/signup' && req.method === 'GET') {
        res.end(generateSignFormPage(true));
    } else if (req.url === '/signup' && req.method === 'POST') {
        let data;
        req.on("data", (dataChunk) => {
            data += dataChunk.toString();
        });
        req.on("end", async () => {
            try {
                const params = data.split("&");
                const username = params[0].split("=")[1];
                const password = params[1].split("=")[1];
                const findQuery = `select count(username) from account where username='${username}'`; 
                const findResult = await client.query(findQuery);
                const USERNAME_IS_UNKNOWN = 0;
                if (parseInt(findResult.rows[0].count) === USERNAME_IS_UNKNOWN) {
                    const salt = crypto.randomBytes(16).toString('hex');
                    const hash = crypto.createHash("sha256").update(password).update(salt).digest("hex");
                    const insertQuery = `INSERT INTO account (username, salt, hash) VALUES ('${username}', decode('${salt}','hex') , decode('${hash}','hex'));`; 
                    await client.query(insertQuery); 
                    res.end(`<html><body><h1>Sign Up is a Success</h1><a href="/signin">You can sign in now !</a></body></html>`);
                } else {
                    res.end(`<html><body><h1>Sign UP Failure</h1><div>Username already signed up !</div><a href="/">Retry</a></body></html>`);
                }
            } catch(e) {
                console.log(e);
                res.end(`<html><body><h1>Failure</h1><a href="/">Retry</a></body></html>`);
            }
        });
    } else if (req.url === '/signin' && req.method === 'GET') {
        res.end(generateSignFormPage(false));
    } else if (req.url === '/signin' && req.method === 'POST') {
        let data;
        req.on("data", (dataChunk) => {
            data += dataChunk.toString();
        });
        req.on("end", async () => {
            try {
                const params = data.split("&");
                const username = params[0].split("=")[1];
                const password = params[1].split("=")[1];
                const findQuery = `select username, encode(salt,'hex') as salt, encode(hash,'hex') as hash from account where username='${username}'`; 
                const findResult = await client.query(findQuery);
                const USERNAME_IS_UNKNOWN = 0;
                if (parseInt(findResult.rows.length) !== USERNAME_IS_UNKNOWN) {
                    const salt = findResult.rows[0].salt;
                    const trueHash = findResult.rows[0].hash;
                    const computedHash = crypto.createHash("sha256").update(password).update(salt).digest("hex");
                    if (trueHash === computedHash) { //AUTHENTICATED
                        sessions[sessionId].username = username;
                        res.end(`<html><body><h1>Sign In Success</h1>Welcome ${username}. Visit <a href="/">our site</a> </body></html>`);
                    } else {
                        res.end(`<html><body><h1>Sign IN Failure</h1> Wrong Password ! <a href="/signin">Retry</a></body></html>`);
                    }
                } else {
                    res.end(`<html><body><h1>Sign IN Failure</h1> Wrong Username ! <a href="/signin">Retry</a></body></html>`);
                }
            } catch(e) {
                console.log(e);
                res.end(`<html><body><h1>Something goes wrong</h1> <a href="/">Retry</a></body></html>`);
            }
        });
    } else if (req.url === '/logout' && req.method === 'GET') {
        if (sessions[sessionId]) {
            delete sessions[sessionId].username; // supprime le nom d'utilisateur de la session
        }
        res.writeHead(302, {
            'Location': '/'
        });
        res.end();
    }else if (req.method === 'GET' && req.url.startsWith('/public/')) {
        try {
            const fichier = fs.readFileSync('.'+req.url);
            res.end(fichier);
        } catch (err) {
            console.log(err);
            res.end("erreur ressource");
        }
    } else if (req.method === "POST" && req.url === "/commentaire-image") {
        let donnees="";
        req.on("data", (dataChunk) => {
            donnees += dataChunk.toString();
        });
        req.on("end", async () => {
            const paramValeurs = donnees.split("&");
            const clef = paramValeurs[0].split("=")[1];
            const comm = paramValeurs[1].split("=")[1];
            const sqlQuery = `INSERT INTO commentaires (texte, id_image) VALUES ('${comm}', ${clef})`;
            await client.query(sqlQuery);
            res.writeHead(302, { "Location": `/page-image/${clef}` });
            res.end();
        });
    } else if (req.url === '/images') {
        const sqlQuery = `SELECT * FROM images`;
        const sqlResult = await client.query(sqlQuery);
        const images = sqlResult.rows;
        const smallImages = images.map(img => img.fichier.replace('.jpg', '_small.jpg'));
        let pageHTML = `
    <!DOCTYPE html>
    <html>
        <head>
            <title>Mur d'images</title>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="/public/style.css">
        </head>
        <body>`;
            if (sessions[sessionId].username) {
    pageHTML += `<div class="droite2">Bienvenue ${sessions[sessionId].username} | <a href="/logout">Se déconnecter</a></div>`;
            } else {
    pageHTML += `<div class="droite2"><a href="/signup">S'inscrire</a> | <a href="/signin">Se connecter</a></div>`;
            }
    pageHTML +=`
            <a href="index">Index</a>
            <h1>Mur d'images</h1>
            <div id="mur">
    `;
            for (let i = 0; i < images.length; i++) {
                    pageHTML += `
                        <a href="/page-image/${images[i].id}"><img src="/public/images/${smallImages[i]}"></a>
                    `;
                    if (sessions[sessionId].username){
                        const sqlQuery2 = `SELECT COUNT(*) FROM accounts_images_like WHERE username='${sessions[sessionId].username}' AND id_image=${images[i].id}`;
                        const sqlResult2 = await client.query(sqlQuery2);
                        const count = parseInt(sqlResult2.rows[0].count);
                        if (count > 0){
                            pageHTML+=`liked`;
                        }else{
                        pageHTML+=`<a href="/like/${images[i].id}">like</a>`;
                        }
                    }
                }
            pageHTML += `
            </div>
        </body>
    </html>`;
            res.end(pageHTML);
    } else if (req.url.startsWith('/like/') && req.method === 'GET') {
        let urlParts = req.url.split('/');
        let i = parseInt(urlParts[2], 10);
        const sqlQuery = `INSERT INTO accounts_images_like (username, id_image) VALUES ('${sessions[sessionId].username}', ${i})`;
        await client.query(sqlQuery);
        res.writeHead(302, {'Location': '/images'});
        res.end();
    } else if (req.url.startsWith('/page-image/')) {
        try {
            const sqlQuery = `SELECT * FROM images`;
            const sqlResult = await client.query(sqlQuery);
            const images = sqlResult.rows;
            const smallImages = images.map(img => img.fichier.replace('.jpg', '_small.jpg'));
            let urlParts = req.url.split('/');
            let clef = parseInt(urlParts[2], 10);
            const sqlQuery2 = `SELECT * FROM commentaires WHERE id_image = ${clef}`;
            const sqlResult2 = await client.query(sqlQuery2);
            const commentaires = sqlResult2.rows;
            let pageHTML2 = `
        <!DOCTYPE html>
        <html>
            <head>
                <link rel="stylesheet" href="/public/style.css">
                <title>Image${clef}</title>
                <meta charset="UTF-8">
            </head>
            <body>
                <a href="/images">Mur</a>
                <div class="centre">
                    <img src="/public/images/${images[clef-1].fichier}" width="500">
                    <p>${images[clef-1].nom}</p>
                    <form action="/commentaire-image" method="post">
                        <input type="hidden" name="clef" value="${clef}">
                        <div><p><h4>Laisser un commentaire :</h4></p><input type="text" name="commentaire"></div>
                        <div><input type="submit" value="Envoyer"></div>
                    </form>
                <h3>Commentaires</h4>`;
            for (let i = 0; i < commentaires.length ; i++) {
                    pageHTML2 += `<p>${commentaires[i].texte}</p>`;
            }
            pageHTML2+=`
                </div>
                <div>`;
                if (clef === 1){
                    pageHTML2 += `
                    <span class="gauche"></span>
                    <a class="droite" href="/page-image/${clef+1}"><img src="/public/images/${smallImages[clef]}"></a>
                    `;
                } else if (clef === images.length) {
                    pageHTML2 += `
                    <a class="gauche" href="/page-image/${clef-1}"><img src="/public/images/${smallImages[clef-2]}"></a>
                    `;
                } else {
                    pageHTML2 += `
                    <a class="gauche" href="/page-image/${clef-1}"><img src="/public/images/${smallImages[clef-2]}"></a>
                    <a class="droite" href="/page-image/${clef+1}"><img src="/public/images/${smallImages[clef]}"></a>
                    `;
                } 
                pageHTML2 += `
                </div>
            <script type="text/javascript" src="/public/page-image.js"></script>
            </body>
        </html>`;
            res.end(pageHTML2);
        } catch (err) {
            console.log(err);
            res.end('erreur page inconnu');
        }
    } else {
        try {
            const sqlQuery2=`SELECT 
    images.nom
FROM images
JOIN accounts_images_like ON accounts_images_like.id_image = images.id
JOIN account ON account.username = accounts_images_like.username
WHERE accounts_images_like.username = '${sessions[sessionId].username}';`
            const sqlResult2 = await client.query(sqlQuery2);
            const nomimg = sqlResult2.rows;
            const sqlQuery = `SELECT * FROM images ORDER BY date DESC LIMIT 3`;
            const sqlResult = await client.query(sqlQuery);
            const images = sqlResult.rows;
            const smallImages = images.map(img => img.fichier.replace('.jpg', '_small.jpg'));
            let indexPage = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/public/style.css">
    <title>Mon Mur d'Images</title>
  </head>
  <body>`;
            if (sessions[sessionId].username) {
    indexPage += `<div class="droite2">Bienvenue ${sessions[sessionId].username} | <a href="/logout">Se déconnecter</a></div>`;
            } else {
    indexPage += `<div class="droite2"><a href="/signup">S'inscrire</a> | <a href="/signin">Se connecter</a></div>`;
            }
    indexPage +=`
    <div class="centre">
    <div>
      <img src="/public/logo.jpg" width="100">
    </div>
    <p>
      Vous trouverez ici toutes les images que j'aime.
    </p>
    <div>`;
    for (let i = 0; i < nomimg.length; i++) {
                indexPage += `${nomimg[i].nom}`;
            }
    indexPage += `</div><div>`;
            for (let i = 0; i < images.length; i++) {
                indexPage += `<a href="/page-image/${images[i].id}"><img src="/public/images/${smallImages[i]}"></a>`;
            }

            indexPage +=`
    </div>
    <a href="/images">Toutes les Images</a>
    </div>
  </body>
</html>`;
            res.end(indexPage);
        } catch (e) {
            console.log(e);
            res.writeHead(500);
            res.end('Erreur interne');
    }
    }
});

function generateSignFormPage(up) {
    let signWhat = up ? 'signup' : 'signin';
    return `<html><body><h1>${signWhat}</h1>
            <form action='/${signWhat}' method="POST">
                <label for="username">Username: </label>
                <input type="text" name="username" id="username" required>
                <label for="username">Password: </label>
                <input type="password" name="password" id="password" required>
                <input type="submit" value="${signWhat}!">
            </form>
            </body></html>`;
}

server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});