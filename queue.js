import EventEmitter from 'events'
import logger from './logger.js';

class Queue extends EventEmitter {
    constructor(processor) {
        super()
        this.processor = processor
        this.items = [];
        this.processing = false;
    }
  
    /*
        Add an item to the queue and start processing
    */
    enqueue(item) {
        logger.debug("One item added to queue")
        this.items.push(item);
        this.emit('update', this.items.length)
        this.processNext();
    }
  
    // Verwerk het volgende item in de wachtrij
    async processNext() {
      if (this.processing || this.items.length === 0) {
        logger.debug('Processing of item initiated but stopped becasue queue is empty or processing already ongoing')
        return;
      }
      logger.debug("One item removed from queue")

      this.processing = true;
      const item = this.items.shift();

      try {
        logger.debug("Starting processing")
        await this.processor(item);
        logger.debug("Processing finished")
      } catch (error) {
        console.error(`Fout bij verwerking van item: ${error.message}`);
      } finally {
        this.emit('update', this.items.length);
        this.processing = false;
        this.processNext();
      }
    }
  
  }
  
  export default Queue