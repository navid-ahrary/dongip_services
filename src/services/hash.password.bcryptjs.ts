import { genSalt, hash, compare, } from 'bcryptjs'
import { inject } from '@loopback/core'
import { PasswordHasherBindings } from '../keys'

/**
 * Service HashPassword using module 'bcryptjs'.
 * It takes in a plain password, generates a salt with given
 * round and returns the hashed password as a string
 */
export type HashPassword = (
  password: string,
  rounds: number,
) => Promise<string>
// bind function to `services.bcryptjs.HashPassword`
export async function hashPassword ( password: string, rounds: number )
  : Promise<{ password: string, salt: string }> {
  const salt = await genSalt( rounds )
  return { password: await hash( password, salt ), salt: salt }
}

export interface PasswordHasher<T = string> {
  hashPassword ( password: T ): Promise<{ password: string, salt: string }>
  comparePassword ( providedPass: T, storedPass: T ): Promise<boolean>
}

export class BcryptHasher implements PasswordHasher<string> {
  constructor (
    @inject( PasswordHasherBindings.ROUNDS ) private readonly rounds: number,
  ) { }

  async hashPassword ( password: string )
    : Promise<{ password: string, salt: string }> {
    const salt = await genSalt( this.rounds )
    return { password: await hash( password, salt ), salt: salt }
  }

  async comparePassword ( providedPass: string, storedPass: string )
    : Promise<boolean> {
    const passwordIsMatched = await compare( providedPass, storedPass )
    return passwordIsMatched
  }
}
