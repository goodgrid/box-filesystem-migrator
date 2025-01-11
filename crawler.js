import fs from "fs/promises";
import path from "path";
import config from "./config.js";
import logger from "./logger.js";

const crawl = async (dir) => {
    const paths = []

    const items = await fs.readdir(dir) 
   
    for (const item of items) {
        const filePath = path.join(dir, item)

        try { 
            const itemStats = await fs.stat(filePath)
            if (itemStats.isDirectory()) {
                if (!directoryExcluded(filePath)) {
                    const subItems = await crawl(filePath)
                    paths.push(...subItems)
                } else {
                    logger.debug(`Skipped folder ${dir}/${item}`)
                }
            } else {
                if (!fileExcluded(item)) {
                    paths.push(filePath)
                } else {
                    logger.debug(`Skipped file ${dir}/${item}`)
                }
            }
        } catch (error) {
            logger.error(`Error while processing ${filePath}: ${error}`)
        }
    }
    return paths
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