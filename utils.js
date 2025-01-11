import fs from 'fs'

export const validateCommand = (args) => {
    
    try {
        if (fs.lstatSync(args[2]).isDirectory()) {
            return true
        }
    } catch(error) {
        return false
    }


}