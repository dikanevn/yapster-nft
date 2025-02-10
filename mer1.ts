import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

// Количество генерируемых адресов
const NUM_ADDRESSES = 1000000;
const addresses: string[] = [];

// Генерируем 100 случайных адресов
for (let i = 0; i < NUM_ADDRESSES; i++) {
  const keypair = Keypair.generate();
  addresses.push(keypair.publicKey.toString());
}

// Сохраняем адреса в формате JSON в файл "maddrs.json"
fs.writeFileSync("maddrs.json", JSON.stringify(addresses, null, 2));

console.log(`Сгенерировано и сохранено ${NUM_ADDRESSES} адресов в файл "maddrs.json"`); 
