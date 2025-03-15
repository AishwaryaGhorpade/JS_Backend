import multer from "multer";
//Multer stores files in req.files as an object

/*Multer is a middleware for handling multipart/form-data, which is used for uploading files.
It provides functionality to store files either in memory (RAM) or on disk (filesystem).  */

// 2 provide 2 types of space 1)diskStorage ,2)memoryStorage.any one can use

const storage=multer.diskStorage({  // storage engine for multer
    destination:function(req,file,cb){
        cb(null,"./public/temp")
    },
    filename:function(req,file,cb){
        cb(null,file.originalname)
    }
})   //This storage engine saves the file on the local disk. It allows customization of where the files should be saved and how the filename should be determined.

export const upload=multer({     //Configuring Multer with the storage Engine:
    storage
})