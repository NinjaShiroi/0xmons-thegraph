import {log} from "@graphprotocol/graph-ts"
import {
  Transfer,
  MonMinter,
} from "../generated/MonMinter/MonMinter"
import {
  RegisterMonCall,
} from "../generated/MonImageRegistry/MonImageRegistry"
import { Monster } from "../generated/schema"

export function handleTransfer(event: Transfer): void {
  let minterContract = MonMinter.bind(event.address)

  let monsterNumber = event.params.tokenId
  let monsterId = monsterNumber.toHex()
  let monster = Monster.load(monsterId)
  if (monster == null) {
    monster = new Monster(monsterId)
  }

  log.warning('0xmon #' + monsterId.toString(), [])

  let monRecords = minterContract.monRecords(monsterNumber)

  monster.number = monsterNumber
  monster.owner = event.params.to
  monster.summoner = monRecords.value0
  monster.parent1Id = monRecords.value1
  monster.parent2Id = monRecords.value2
  monster.minterContract = monRecords.value3
  monster.contractOrder = monRecords.value4
  monster.gen = monRecords.value5
  monster.bits = monRecords.value6
  monster.exp = monRecords.value7
  monster.rarity = monRecords.value8

  monster.tokenUri = minterContract.tokenURI(monsterNumber)

  monster.save()
}

export function handleRegisterMonster(call: RegisterMonCall): void {
  let monsterNumber = call.inputs.id
  let monsterId = monsterNumber.toHex()
  let txHash = call.inputs.txHash.toString()
  let monster = Monster.load(monsterId)
  if (monster == null) {
    monster = new Monster(monsterId)
  }

  if (txHash.includes('|')) {
    // encoded in storage
    log.warning('Handling static 0xmon #' + monsterId.toString() + ' from STORAGE' + call.inputs.txHash.toString(), [])
    let data = txHash.split('|')

    if (data.length === 4) {
      monster.onStorageName = data[0]
      monster.onStorageLore = data[1]
      monster.onStorageEpithet = data[2]
      monster.onStorageImage = data[3]
    }
  } else {
    // encoded in calldata
    if (call.inputs.isStatic) {
      log.warning('Handling static 0xmon #' + monsterId.toString() + ' from CALLDATA', [])
      monster.onCalldataStaticHash = call.inputs.txHash.toHexString()
    } else {
      log.warning('Handling animated 0xmon #' + monsterId.toString() + ' from CALLDATA', [])
      monster.onCalldataAnimatedHash = call.inputs.txHash.toHexString()
    }
  }

  monster.save()
}
