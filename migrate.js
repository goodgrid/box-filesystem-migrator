import crawl from "./crawler.js"
import uploadItem from "./uploader.js"
import Queue from "./queue.js"

const queue = new Queue(uploadItem)

queue.on('update', (length) => {
    process.stdout.write(`\rQueue length: ${length}`);
});

crawl(process.argv[2], queue)