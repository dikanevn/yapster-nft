import * as fs from 'fs';
import * as path from 'path';

// Определяем путь к файлу maddrs.json
const addressesFilePath = path.join(__dirname, "maddrs.json");

try {
  // Чтение адресов из файла "maddrs.json"
  const data = fs.readFileSync(addressesFilePath, "utf8");
  const addresses: string[] = JSON.parse(data);
  console.log(`Считано ${addresses.length} адресов из файла "maddrs.json"`);

  // Сортировка адресов по лексикографическому порядку
  addresses.sort((a, b) => a.localeCompare(b));

  // Сохранение отсортированных адресов обратно в "maddrs.json"
  fs.writeFileSync(addressesFilePath, JSON.stringify(addresses, null, 2));
  console.log(`Отсортированные адреса сохранены в файл "maddrs.json"`);
} catch (error) {
  console.error("Ошибка при обработке файла maddrs.json:", error);
}