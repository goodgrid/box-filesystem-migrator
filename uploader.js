import fs from 'fs'
import path from 'path'
import FolderService from "./folderservice.js";
import boxApi from './boxapi.js'
import logger from './logger.js'
import config from './config.js'
import FormData from 'form-data'

var folderService = new FolderService();

const uploadItem = async (item) => {

    logger.debug(`Uploading ${item}`)

    const itemFolderPath = path.dirname(item)
    const itemName = path.basename(item)

    const parentId = await folderService.getFolderId(itemFolderPath)

    const boxMetadata = {
        name: itemName,
        parent: {
            id: parentId
        }
    }

    const formData = new FormData()
    formData.append("attributes", JSON.stringify(boxMetadata))
    formData.append("file", fs.createReadStream(item))

    const options = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
    }

    try {
        await boxApi.post(`${config.boxUploadBaseUrl}files/content`, formData, options)
    } catch(error) {
        logger.error(`Error while uploading ${item} : %j`, error.response ? error.response.data : error)
    }
}

export default uploadItem


