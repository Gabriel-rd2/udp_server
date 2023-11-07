const cv = require("@u4/opencv4nodejs");

const dgram = require("node:dgram");
const log = console.log;
// const { log } = require("./util/loggerTool");

const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

const conf = {
  port: 41234,
};

const start_server = () => {
  const server = dgram.createSocket("udp4");

  server.on("listening", () => {
    const address = server.address();
    const port = address.port;
    const family = address.family;
    const ipaddr = address.address;

    log("udp_server", "info", "Server is listening at port " + port);
    log("udp_server", "info", "Server ip :" + ipaddr);
    log("udp_server", "info", "Server is IP4/IP6 : " + family);
  });

  server.on("message", (msg, info) => {
    log(
      "udp_server",
      "info",
      `Received ${msg.length} bytes from ${info.address}:${info.port}`
    );

    let json = msg.buffer.toJson();
    let buf = Buffer.from(json.image);
    let image = cv.imdecode(buf);

    const faceRects = classifier.detectMultiScale(image).objects;
    if (faceRects.length) {
      for (let faceRect of faceRects) {
        image.drawRectangle(faceRect, new cv.Vec(0, 255, 0), 0.5, cv.LINE_AA);
      }
    }

    const responseImage = cv.imencode(".jpg", image).toString("base64");
    const data = Buffer.from(responseImage, "base64");

    //sending msg
    server.send(data, info.port, info.address, (error, bytes) => {
      if (error) {
        log("udp_server", "error", error);
        server.close();
      } else {
        log("udp_server", "info", "Data sent !!!");
      }
    });
  });

  server.on("error", (error) => {
    log("udp_server", "error", error);
    server.close();
  });

  server.on("close", () => {
    log("udp_server", "info", "Socket is closed !");
  });

  server.bind(conf.port);
};

start_server();
