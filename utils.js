import fs from 'fs'

export const isValidCommand = (args) => {
    
    try {
        if (fs.lstatSync(args[2]).isDirectory()) {
            return true
        }
    } catch(error) {
        return false
    }


}