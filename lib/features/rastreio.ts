import { request } from '../utils/request';
import URL from '../utils/URL';
import crypto from 'crypto';

const currentDate = new Date();
const day = String(currentDate.getDate()).padStart(2, '0');
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const year = String(currentDate.getFullYear());
const hours = String(currentDate.getHours()).padStart(2, '0');
const minutes = String(currentDate.getMinutes()).padStart(2, '0');
const seconds = String(currentDate.getSeconds()).padStart(2, '0');
const apiUrl = "https://correios-auth-token.andersu.dev/?token=c0176e07417ef5760ed391de0cfb7e00";
// Token Constante da requisição de PROXYAPP_RASTREAR
let REQUEST_TOKEN = "nqPQAT8dqe7YUpC55cenPeaOCojb/foQo35WejFe7vhr6+ihgUDNyUaw+f4AJOdQOhEFGAoyEItV2EwX7BrsVUMhn4fZhsF+SLAs1yydsTQ+7HAs97ovPFpBs8N2JONtyICKoh45iXIQ5ShqatPWC29lDqxjJdjOTknuhn8etR2VYj8Ja2OhpNF6jRw776+qLF5mfWFhP6XaL3TuwPubjEMV94dNcjPRGToY+A9E4yhZKFFQytxfWGHZgSjxJO7ymppbifndDF+rmsQCJvfP75j4akLWHzWmt38ZtUMovcJrK1bQQWDiqMufVdEoYdVoX1HKv2ZPpTqyOh/yfi4d/Q=="
// 'YW5kcm9pZDtici5jb20uY29ycmVpb3MucHJlYXRlbmRpbWVudG87RjMyRTI5OTc2NzA5MzU5ODU5RTBCOTdGNkY4QTQ4M0I5Qjk1MzU3ODs1LjEuMTQ=';
// const REQUEST_DATA = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
// const REQUEST_SIGN = crypto
//   .createHash('md5')
//   .update(`requestToken${REQUEST_TOKEN}data${REQUEST_DATA}`)
//   .digest('hex');

// Guarda o token em cache e a data de expiração
let tokenValue: string = null;
let tokenExpiration: number = 0;
let tokenPromise: Promise<string> = null;


// URL da API que retorna o token


function getToken() {
  return fetch(apiUrl)
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Erro ao obter o token da API");
      }
      return response.json(); // Parse a resposta JSON
    })
    .then(function(data) {
      if (data && data.token) {
        REQUEST_TOKEN = data.token;
        console.log("Token atribuído com sucesso:", REQUEST_TOKEN);
      } else {
        throw new Error("Token não encontrado na resposta da API");
      }
    })
    .catch(function(error) {
      console.error("Erro:", error);
    });
}

// Chamando a função para obter o token
getToken();







function rastrearEncomendas(codes: Array<string>): Promise<any> {
  /**
   * @param {Array[String]} codes
   * Função responsável por realizar a consulta de uma ou mais encomendas
   */

  const response: any = Promise.all(
    codes.map((code: string) => fetchTrackingService(code)),
  ).then(object => object);
  return response;
}

function gerarTokenApp(): Promise<string> {
  /**
   * Função responsável por gerar um token para realizar a consulta de encomendas caso o token não esteja em cache
   */

  // Checa se o token está em cache e se não está expirado
  if (tokenValue && tokenExpiration > Date.now()) {
    return Promise.resolve(tokenValue);
  }

  // Checa se já existe uma promise de token em andamento
  if (tokenPromise) {
    return tokenPromise;
  }

  // Cria uma nova promise de token
  tokenPromise = new Promise((resolve, reject) => {
    request(URL.PROXYAPP_TOKEN, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Dart/2.18 (dart:io)',
      },
      data: {
        requestToken: REQUEST_TOKEN
        // data: REQUEST_DATA,
        // sign: REQUEST_SIGN,
      },
    })
      .then((body: any) => {
        tokenPromise = null;
        const jwt = body.data.token;
        // Parseia o JWT para pegar a data de expiração (iat)
        const jwtData = jwt.split('.')[1];
        const jwtBuffer = Buffer.from(jwtData, 'base64');
        const jwtString = jwtBuffer.toString('ascii');
        const jwtObject = JSON.parse(jwtString);
        // Guarda o token em cache e a data de expiração
        tokenValue = jwt;
        tokenExpiration = jwtObject.exp * 1000 - 120000; // 120 segundos de margem
        resolve(jwt);
      })
      .catch((err: any) => {
        tokenValue = null;
        tokenExpiration = 0;
        tokenPromise = null;
        reject(new Error('Falha ao autenticar requisição'));
      });
  });

  return tokenPromise;
}

function fetchTrackingService(code: string): Promise<any> {
  /**
   * @param {string} code
   */
  return new Promise((resolve, reject) => {
    // Gera um token para realizar a consulta
    gerarTokenApp()
      .then((token: string) => {
        // Realiza a consulta
        request(`${URL.PROXYAPP_RASTREAR}/${code}`, {
          method: 'GET',
          headers: {
            'content-type': 'application/json',
            'user-agent': 'Dart/2.18 (dart:io)',
            'app-check-token': token,
          },
        })
          .then((body: any) => {
            // Retorna o resultado da consulta
            return resolve(body.data.objetos[0]);
          })
          .catch((error: any) => {
            reject(error);
          });
      })
      .catch(reject);
  });
}

export default rastrearEncomendas;