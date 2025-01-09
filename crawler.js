import fs from "fs";
import path from "path";
import config from "./config.js";
import logger from "./logger.js";

const crawl = (dir, queue) => {
    const items = fs.readdirSync(dir) 
    
    for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        
        const filePath = path.join(dir, item)

        try { 
            const itemStats = fs.statSync(filePath)
            if (itemStats.isDirectory()) {
                if (!directoryExcluded(filePath)) {
                    crawl(filePath, queue)
                } else {
                    logger.debug(`Skipped folder ${dir}/${item}`)
                }
            } else {
                if (!fileExcluded(item)) {
                    queue.enqueue(filePath)
                } else {
                    logger.debug(`Skipped file ${dir}/${item}`)
                }

            }
        } catch (error) {
            logger.error(`Error while processing ${filePath}: ${error}`)
        }
    }
}

export default crawl

const directoryExcluded = function(directory) {
    for (const regularExpression of config.excludedDirectories) {
        if (regularExpression.test(path.basename(directory))) return true
    }
    return false
}

const fileExcluded = function(file) {
    for (const regularExpression of config.excludedFiles) {
        if (regularExpression.test(file)) return true
    }
    return false
}