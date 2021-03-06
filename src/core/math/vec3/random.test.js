const test = require('ava')
const { create, random } = require('./index')

const { compareVectors } = require('../../../../test/helpers/index')

test('vec3: random() should return a vec3 with correct values', (t) => {
  const obs1 = random([0, 0, 0])
  t.true(compareVectors(obs1, [1, 0, 0]))

  const obs2 = random([3, 1, 3])
  t.true(compareVectors(obs2, [0, 1, 0]))

  const obs3 = random([3, 2, 1])
  t.true(compareVectors(obs3, [0, 0, 1]))
})

test('vec3: random() with two params should update a vec3 with correct values', (t) => {
  const org1 = create()
  const ret1 = random(org1, [0, 0, 0])
  t.true(compareVectors(org1, [1, 0, 0]))
  t.true(compareVectors(ret1, [1, 0, 0]))
  t.is(org1, ret1)

  const org2 = create()
  const ret2 = random(org2, [3, 1, 3])
  t.true(compareVectors(org2, [0, 1, 0]))
  t.true(compareVectors(ret2, [0, 1, 0]))
  t.is(org2, ret2)

  const org3 = create()
  const ret3 = random(org3, [3, 2, 1])
  t.true(compareVectors(org3, [0, 0, 1]))
  t.true(compareVectors(ret3, [0, 0, 1]))
  t.is(org3, ret3)
})
