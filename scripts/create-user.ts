// scripts/create-user.ts
// Creates a user with specific credentials

import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../lib/mongodb'
import { User } from '../lib/models/User'
import logger from '../lib/logger'

const email = 'dharadarsh0@gmail.com'
const password = 'Ad23adarsh#'
const name = 'Adarsh Dhar'

async function main() {
  await connectDB()

  logger.info('Creating user...')
  logger.info(`Email: ${email}`)

  // Check if user exists
  const existing = await User.findOne({ email })
  if (existing) {
    logger.info('User already exists')
    logger.info(`User ID: ${existing._id.toString()}`)
    await mongoose.disconnect()
    return
  }

  // Create user
  const hashed = await bcrypt.hash(password, 12)
  const user = await User.create({
    email,
    name,
    password: hashed,
    portfolio: { cards: {} }
  })

  logger.info(`User created: ${user._id.toString()}`)
  logger.info('=== CREDENTIALS ===')
  logger.info(`Email: ${email}`)
  logger.info(`Password: ${password}`)
  logger.info('==================')

  await mongoose.disconnect()
}

main().catch(logger.error)
