class ApiError extends Error {
    constructor(
        statusCode,
        message= "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        // generally we have very big API files and this stack help us to find the error in that API code.
        if (stack) {
            this.stack = stack
        } 
        else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}