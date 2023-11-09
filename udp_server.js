// ===============================================
// Código de servidor UDP que recebe mídia, e retorna imagem com reconhecimento facial para cliente.
// Disciplina: Redes de Computadores II - Prof. Elias P. Duarte Jr.
// Aluna: Gabriel de Almeida Sales Evaristo - GRR20165266
// ===============================================

// Importação de bibliotecas
const cv = require("@u4/opencv4nodejs"); // manipulação de imagens
const ip = require("ip"); // manipulação de endereços IP
const dgram = require("node:dgram"); // comunicação via UDP
const { Buffer } = require("node:buffer");

// Definição da configuração do servidor
const conf = {
  address: ip.address(),
  port: 41234,
};

// Array para manter o endereço IP dos clientes atendidos
let clients = [];

// Criação de um classificador para reconhecimento facial
const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

// Função que define o servidor UDP
const start_server = () => {
  console.log("Instanciando o Socket ...");
  const server = dgram.createSocket("udp4");

  console.log('Registrando callback para o evento "listening" ...');
  server.on("listening", () => {
    const address = server.address();
    console.log(
      "%s%s",
      `Socket iniciado! ${address.family} ${conf.address}:${address.port}\n`,
      "-----------------------------------------------------------------------------\n"
    );
  });

  console.log('Registrando callback para o evento "message" ...');
  server.on("message", (msg, info) => {
    // Converte a mensagem recebida em um objeto JSON
    const message = JSON.parse(msg.toString());

    console.log(
      `A mensagem ${message.order}, com ${msg.length} bytes, foi recebida de ${info.address}:${info.port}!`
    );

    // Adiciona endereço do remetente em clients,
    // se já não está lá
    if (!clients.includes(info.address)) clients.push(info.address);

    // Converte a imagem recebida para um objeto OpenCV
    let buf = Buffer.from(message.image, "base64");
    let image = cv.imdecode(buf);

    // Detecta rostos na imagem e desenha retângulos ao redor deles
    const faceRects = classifier.detectMultiScale(image).objects;
    if (faceRects.length) {
      for (let faceRect of faceRects) {
        image.drawRectangle(faceRect, new cv.Vec(0, 255, 0), 1, cv.LINE_AA);
      }
    }

    // Prepara os dados para envio de volta ao cliente
    const data = JSON.stringify({
      order: message.order,
      image: cv.imencode(".jpg", image).toString("base64"),
    });

    // Envia a mensagem de volta para o cliente
    server.send(data, info.port, info.address, (error, bytes) => {
      if (error) {
        console.log("Falha ao enviar a mensagem %d!", message.order);
        console.log("Erro:", error);
        console.log(
          "-----------------------------------------------------------------------------"
        );
        console.log("Fechando o socket...");

        // No caso de um erro isso é indicado no log e o socket é fechado
        server.close();
      } else {
        console.log(
          `A mensagem ${message.order}, de ${bytes} bytes, foi enviada para ${info.address}:${info.port}!`
        );
      }
    });
  });

  console.log('Registrando callback para o evento "error" ...');
  server.on("error", (error) => {
    console.log("Aconteceu um erro durante a execução do programa!");
    console.log("Erro:", error);
    console.log(
      "-----------------------------------------------------------------------------"
    );
    console.log("Fechando o socket...");

    server.close();
  });

  console.log('Registrando callback para o evento "close" ...');
  server.on("close", () => {
    console.log("Socket fechado!\n");
    console.log(
      "%s%s%s%s%s",
      "=============================================================================\n",
      "Fim da execucao: udp_server.js\n",
      `Clientes atendidos: ${clients.length}\n`,
      "=============================================================================\n"
    );
    process.exit(0);
  });

  // Faz o bind do servidor na porta especificada
  server.bind(conf.port);
};

// Inicialização do servidor UDP
console.log(
  "%s%s%s%s%s",
  "=============================================================================\n",
  "Inicio da execucao: udp_server.js\n",
  "Disciplina Redes de Computadores II  -  Prof. Elias P. Duarte Jr.\n",
  "Aluna: Gabriel de Almeida Sales Evaristo - GRR20165266\n",
  "=============================================================================\n"
);

start_server();
