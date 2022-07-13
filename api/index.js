const express = require("express");
const app = express();

app.use(express.json());

const router = express.Router();
const crypto = require("crypto");
const date = require("date-and-time");

const lifetime = 60 * 60 * 24 * 7;

require("dotenv").config();

// Form data
const fileUpload = require("express-fileupload");

// CORS
// // declared origins from which the server will accept requests
// let allowedOrigins = ["http://localhost:3000"];
// // middleware which checks the origins
// app.use(
//     cors({
//         origin: function (origin, callback) {
//             // allow requests with no origin
//             // (like mobile apps or curl requests)
//             if (!origin) return callback(null, true);
//             if (allowedOrigins.indexOf(origin) === -1) {
//                 let msg =
//                     "The CORS policy for this site does not " +
//                     "allow access from the specified Origin.";
//                 return callback(new Error(msg), false);
//             }
//             return callback(null, true);
//         }
//     })
// );
// app.use(function (req, res, next) {
//   let origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.header("Access-Control-Allow-Origin", origin); // restrict it to the required domain
//   }

//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

// DB Setup
const { put, get, addPhotos, removePhoto } = require("./db");

// S3 Setup
const { upload, photoDel } = require("./s3");

// Compression
const sharp = require("sharp");

// Encrypter
class Encrypter {
  constructor() {
    this.algorithm = "aes-256-cbc";
    this.key = crypto.scryptSync(process.env.SECURITY_KEY, "salt", 32);
  }

  encrypt(clearText) {
    const iv = "072fd6de7c0f7268";
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = cipher.update(clearText, "utf8", "hex");
    return [
      encrypted + cipher.final("hex"),
      Buffer.from(iv).toString("hex"),
    ].join("|");
  }

  decrypt(encryptedText) {
    const [encrypted, iv] = encryptedText.split("|");
    if (!iv) throw new Error("IV not found");
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, "hex")
    );
    return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
  }
}

app.get("/secret", (req, res) => {
  // Enter api/secret?pw=<password> to get secret
  const { pw } = req.query;
  res.send(crypto.createHmac("sha256", pw).digest("hex"));
});

// Vaguely Garbage PW Implementation
app.post("/login", (req, res) => {
  try {
    const { email, pw } = req.body;
    const valid_accounts = JSON.parse(process.env.ACCOUNTS).filter(
      (account) =>
        account.email === email &&
        crypto.createHmac("sha256", pw).digest("hex") === account.pwsecret
    );

    if (valid_accounts.length) {
      const encrpypter = new Encrypter();
      let encrypted = encrpypter.encrypt(
        process.env.PW_SECRET + "-" + Math.floor(new Date().getTime() / 1000)
      );
      res.status(200).json({ redirect: "/dashboard?token=" + encrypted });
    } else {
      res.status(200).json({
        err: "Invalid username or password",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({
      err: "Invalid username or password",
    });
  }
});

app.get("/dashboard", checkToken, (req, res) => {
  // Verify token
  res.send({ valid: true });
});

function replaceAll(str, find, replace) {
  let prevstr;
  while (prevstr != str) {
    prevstr = str;
    str = str.replace(find, replace);
  }
  return str;
}

app.post("/albums", checkToken, async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    res.send({ err: "Title is required" });
  }

  const id = replaceAll(
    replaceAll(title.toLowerCase(), " ", "_"),
    /[^0-9a-z_]/,
    ""
  );

  try {
    const dbRes = await put(id, title);
    res.send({ success: true, message: `${title} probably added` });
  } catch (err) {
    console.log(err);
    res.send({ err: err.toString() });
  }
});
app.get("/albums", checkToken, async (req, res) => {
  try {
    const dbRes = await get();
    if (dbRes.success) {
      res.send({ success: true, items: dbRes.items });
    } else {
      res.send({ err: dbRes.err });
    }
  } catch (err) {
    console.log(err);
    res.send({ err: err.toString() });
  }
});
app.post("/photos", checkToken, fileUpload(), async (req, res) => {
  try {
    let files = req.files.photos;
    if (!files.length) {
      files = [files];
    }
    const { album_id } = req.query;
    const dbRes = await get();
    if (dbRes.success) {
      if (dbRes.items.filter((item) => item.album_id === album_id).length) {
        //Check if album exists
        // Upload to s3
        let return_arr = [];
        let photos = [];
        for (let i = 0; i < files.length; i++) {
          let deconstruct = files[i].name.split(".");
          if (process.env.USE_TIMESTAMP) {
            const now = new Date();
            const time = date.format(now, "YYYYMMDD-HHmmss");

            deconstruct[deconstruct.length - 2] =
              time + "-" + deconstruct[deconstruct.length - 2];
          }
          let filename = deconstruct.join(".");

          try {
            const { Key: key, Location: location } = await upload(
              files[i],
              `photos/large/${filename}`
            );

            if (key) {
              return_arr.push({ success: true, name: files[i].name, location });
              photos.push(location);

              // Upload compressed image
              sharp(files[i].data)
                .resize({ width: 400 })
                .toBuffer()
                .then((data) => {
                  upload({ data }, `photos/small/${filename}`);
                });
            } else {
              return_arr.push({ success: false, name: files[i].name });
            }
          } catch (err) {
            console.log(err);
            return_arr.push({ success: false, err });
          }
        }

        // Add urls to db
        const photosRes = await addPhotos(
          album_id,
          photos.map((photo) => photo)
        );

        console.log(`${photos.join(", ")} (hopefully) added to db`);

        res.status(200).json({ return_arr });
      } else {
        res.send({ err: "Album not found" });
      }
    } else {
      res.send({ err: dbRes.err });
    }
  } catch (err) {
    console.log(err);
    res.send({ err: err.toString() });
  }
});

app.delete("/photos", checkToken, async (req, res) => {
  let { photo: photoString, album_id } = req.query;
  const key = decodeURI(photoString).split("aws.com/").pop();

  try {
    const { err, data } = photoDel(key);
    if (err) {
      console.log(`Error deleting ${key}`);
      console.log(err);
      res.send({ err });
    } else {
      console.log({ data });
      removePhoto(album_id, photoString);
      console.log(`${key} deleted`);
      res.send({ success: true });
    }
  } catch (err) {
    console.log(err);
    res.send({ err });
  }
});

function checkToken(req, res, next) {
  const { token } = req.query;
  console.log("Checking Token", token);
  try {
    if (!token) {
      res.json({ err: "Invalid Token", redirect: "/" });
      return false;
    }

    const pwSecret = process.env.PW_SECRET;

    const encrypter = new Encrypter();
    const decrpyted = encrypter.decrypt(token);

    const [secret, timestamp] = decrpyted.split("-");

    if (
      !(
        secret === pwSecret &&
        timestamp - Math.floor(new Date().getTime() / 1000) <= lifetime
      )
    ) {
      console.log("failed");
      res.status(400).send({ err: "Invalid Token", redirect: "/" });
    } else {
      next();
    }
  } catch (err) {
    console.log(err);
    res.status(400).send({ err, redirect: "/" });
  }
}

if (require.main === module) {
  const port = 3001;
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

module.exports = app;
