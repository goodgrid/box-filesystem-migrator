import boxApi from "./boxapi.js";
import logger from "./logger.js";
import config from "./config.js";


class FolderService {
    constructor() {
        this.cache = [
            {
                path: "",
                folderId: config.rootFolderId}
        ] 
    }

    async getFolderId(path) {
        /*
            This is the mainfolder that can be prepares the path, looks it
            up in cache. A cached entry is returned. A non-cached path is
            created in Box whereas if that folder already exists the existing
            folderId is returned.
        */
        
        const entry = this.cache.find(entry => entry.path === path);
        return (entry) ? entry.folderId : (await this.fetchFolderId(path));        
    }


    async fetchFolderId(path) {
        /*
            This function is called if the folder is not in cache and we need Box
            to create it and/or provide the folderId. If the parent folder is not
            in cache, we're recursing up to the root.
        */        
        const pathArray = path.split("/");
        
        const parentFolderId = await this.getFolderId(pathArray.slice(0, pathArray.length -1 ).join("/"))

        const folderName = pathArray[pathArray.length -1]
        
        const requestBody = {name: folderName.trim(), parent: {id: parentFolderId}};
        
        try {
            const response = await boxApi.post("/folders/", requestBody)
            const returnedFolderId = response.data.id;
            return this.appendCache(path, returnedFolderId, true)
        } 
        catch(error) {
            if (error.response && error.response.status == 409) {
                if (error.response.data.code == "name_temporarily_reserved") {
                    logger.warn("Path " + path + " already reserved. Retrying to get folderId")
                    return await this.fetchFolderId(path)
                } else if (error.response.data.code == "item_name_in_use") {
                    let returnedFolderId = error.response.data.context_info.conflicts[0].id;
                    return this.appendCache(path, returnedFolderId, false)
                } else {
                    logger.error("Non-handled error", error.response.data.code)
                }
            } else {  
                logger.error(`Error while fetching path ${path} : %j`, (error.response && error.response.data) ? error.response.data.message : "unknown error")
            }
        }
    }

    appendCache(path, folderId, createdNow) {
        /*
            Every returned foldidId from Box is going through this function. If the given path is not yet in
            cache it's added. It also occurs that the path is already in cache, although we just looked it up in
            the cache vai the getFolder function. Box created duplicate folder names when they are request at the 
            same time. If the path is found in cache, the folderId from that existing entry is returned and not the
            newly created folderId. In that case, the just created folder is deleted. This is a workaround to work
            with Box's behaviour of not being able to check consistency in all cases.
        */

        logger.debug("appendCache: Looking for path " + path + ", about to append it with folderId " + folderId)

        const entry = this.cache.find(entry => entry.path === path);
        
        if ( !entry ) {
            this.cache.push({path:path,folderId:folderId})
            return folderId;
        } else {
            if (createdNow) {
                logger.warn("Folder " + folderId + " was reported as just created, but already sits in the cache. Deleting folder. Existing entry from cache will be returned")
                this.deleteFolder(folderId)
            }
            return entry.folderId;
        }
    }

    deleteFolder(folderId) {
        /*
            If a duplicate folder was found in the cache after creating a new folder, the existing cache entry is 
            further used and the new folder has to be deleted.
        */
        try {
            boxApi.delete(`/folders/${folderId}`)
        } 
        catch(error) {
            logger.error("Error while deleting folder " + folderId, error)
        }
    }

    showCache() {
        /* 
            Just returning the cache for debugging purposes
        */
        return this.cache;
    }
}

export default FolderService