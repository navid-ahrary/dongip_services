/* eslint-disable @typescript-eslint/no-explicit-any */
import { bind, BindingScope } from '@loopback/core'
import moment from 'moment'

@bind( { scope: BindingScope.SINGLETON } )
export class TimeService {
  constructor () { }

  /**
   * Time differential
   */
  public TimeDiff ( startTime: any, endTime: any, format: any ) {
    startTime = moment( startTime, 'YYYY-MM-DD HH:mm:ss' )
    endTime = moment( endTime, 'YYYY-MM-DD HH:mm:ss' )
    return endTime.diff( startTime, format )
  }

  /**
   * now time
   */
  public now () {
    return moment().format()
  }
}
