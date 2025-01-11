import PQueue from "p-queue";
import cliProgress from 'cli-progress'
import crawl from "./crawler.js"
import uploadItem from "./uploader.js"
import logger from "./logger.js";
import { validateCommand } from "./utils.js";
import config from "./config.js";

const queue = new PQueue({ concurrency: config.numUploadThreads });
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

if (validateCommand(process.argv)) {
    const rootPath = process.argv[2]

    logger.info("Migration started")
    logger.info(`Crawling ${rootPath}`)
    
    const items = await crawl(rootPath)
    
    logger.info(`Crawling resulted in ${items.length} files. Now starting upload to Box`)
    
    progressBar.start(items.length, 0);
    
    await Promise.all(items.map(async (item) => {
        return queue.add(async () => {
            await uploadItem(item)
            progressBar.increment(1);
        })
    }))
    
    progressBar.stop()
    
    logger.info("Migration ended")
} else {
    logger.info("The provided argument must be an existing directory.")
}
