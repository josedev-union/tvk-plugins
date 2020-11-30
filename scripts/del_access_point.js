import {DentistAccessPoint} from '../src/models/database/DentistAccessPoint'

const args = process.argv
const id = args[args.length-1]
if (args.length <= 2) {
  console.error('Error: Access point ID needed')
} else {
  console.info(`Destroying ${id}...`)
  DentistAccessPoint.destroy(id).then(() => console.info(`Access Point ${id} was destroyed.`))
}
