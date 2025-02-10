import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";

// Количество генерируемых адресов
const NUM_ADDRESSES = 1000000;
const addresses: string[] = [];

/**
 * Генерирует буфер псевдорандомных байтов заданной длины с использованием Math.random()
 * (не криптографически стойкий, но быстрый)
 * @param length - количество байтов
 * @returns Buffer с генерированными байтами
 */
function generatePseudoRandomBytes(length: number): Buffer {
  const buffer = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

// Генерируем псевдорандомные адреса
for (let i = 0; i < NUM_ADDRESSES; i++) {
  const randomBytes = generatePseudoRandomBytes(32);
  const publicKey = new PublicKey(randomBytes);
  addresses.push(publicKey.toString());
}

// Сохраняем адреса в формате JSON в файл "maddrs.json"
fs.writeFileSync("maddrs.json", JSON.stringify(addresses, null, 2));

console.log(`Сгенерировано и сохранено ${NUM_ADDRESSES} псевдорандомных адресов в файл "maddrs.json"`); 