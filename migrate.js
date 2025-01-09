import crawl from "./crawler.js"
import uploadItem from "./uploader.js"
import PQueue from "p-queue";

const queue = new PQueue({ concurrency: 1 });

const items = await crawl(process.argv[2])

let completed = 0;

const uploadTasks = items.map(async (item) => {
    return queue.add(async () => {
        await uploadItem(item)
        completed += 1;
        //progressBar.update(completed);  
    })
})
  
await Promise.all(uploadTasks);




console.log(items)
console.log(items.length)