import {BigInt, Bytes, log} from "@graphprotocol/graph-ts"
import {
  Transfer,
  MonMinter,
} from "../generated/MonMinter/MonMinter"
import {
  RegisterMonCall,
  UploadMonCall,
} from "../generated/MonImageRegistry/MonImageRegistry"
import {Monster, OnChainData} from "../generated/schema"

export function handleTransfer(event: Transfer): void {
  let minterContract = MonMinter.bind(event.address)

  let monsterNumber = event.params.tokenId
  let monster = createOrLoadMonster(monsterNumber)

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

export function handleUploadMonster(call: UploadMonCall): void {
  let txHash = call.transaction.hash
  let packedData = call.inputs.s.toString()

  log.warning('Handling calldata encoding', [])

  unpackOnChainData(txHash, packedData)
}

export function handleRegisterMonster(call: RegisterMonCall): void {
  let monsterNumber = call.inputs.id
  let monster = createOrLoadMonster(monsterNumber)
  let txHash = call.transaction.hash
  let packedData = call.inputs.txHash.toString()

  if (packedData.includes('|')) {
    // encoded in storage
    log.warning('Handling static 0xmon #' + monsterNumber.toString() + ' from STORAGE', [])
    unpackOnChainData(txHash, packedData)
    monster.onChainStatic = packedData
  } else {
    // encoded in calldata
    // in that case packedData is in fact the hash of the tx containing the packedData
    if (call.inputs.isStatic) {
      log.warning('Handling static 0xmon #' + monsterNumber.toString() + ' from CALLDATA', [])
      monster.onChainStatic = packedData
    } else {
      log.warning('Handling animated 0xmon #' + monsterNumber.toString() + ' from CALLDATA', [])
      monster.onChainAnimated = packedData
    }
  }

  monster.save()
}

function createOrLoadMonster(monsterNumber: BigInt): Monster {
  log.warning('0xmon #' + monsterNumber.toString(), [])

  let monsterId = monsterNumber.toHexString()
  let monster = Monster.load(monsterId)
  if (monster == null) {
    monster = new Monster(monsterId)
  }
  return monster!
}

function unpackOnChainData(txHash: Bytes, packedData: string): void {
  let data = packedData.split('|')
  let onChainData = new OnChainData(txHash.toHexString())

  if (data.length === 4) {
    onChainData.name = data[0]
    onChainData.lore = data[1]
    onChainData.epithet = data[2]
    onChainData.image = data[3]
  }

  onChainData.save()
}
