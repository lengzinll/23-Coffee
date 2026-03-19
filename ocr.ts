import Ocr from '@gutenye/ocr-node'

const ocr = await Ocr.create()
const result = await ocr.detect('follow.jpg')
console.log(result)