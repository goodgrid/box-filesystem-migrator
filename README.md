# Raw documentation

## Global functionality
This project crawls a local filesystem path provided as the argument to `migrate.js`. The resulting list of paths is added to a queue which is then concurrently fed to `uploadItem()`. The number of concurrent threads is configurable in `numUploadThreads`. The path provided as the argument must be an existing folder, which is checked via `isValidPath()`


## To do

- Socket hang-ups are quite common from the Box endpoints. These are not handles, but failing paths are logged to allow for manual correction afterwards