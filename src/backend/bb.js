'use strict'

const FPD = require('./fpd')

class BB {
  /**
   * @constructor Инкрементальный Bollinger Bands
   * @param {number} length - Период в секундах
   * @param {number} stdDev - Множитель stddev
   * @param {number} resetK - При каком разрыве относительно period чистим очередь
   */
  constructor(length = 20 * 60, stdDevMult = 2, resetK = 0.4) {
    this.length = length;
    this.stdDevMult = stdDevMult;
    assert(resetK > 0.1 && resetK < 0.8)
    this.resetInterval = length * resetK;
    this.sum = 0
    this.points = new FPD();
  }


  /**
    * @param {float64} time - время в секундах с дробной частью, если чо
    * @param {float64} price - цена
    * @return {undefined|Object} - undefined или {ml: средняя, tl: верхняя, bl: нижняя}
    */
  append(time, price) {
    let res = this.stdDev(time, price);
    if( res === undefined )
      return false;

    return {
      ml: res.ml,
      tl: res.ml + this.stdDevMult * res.stdDev,
      bl: res.ml - this.stdDevMult * res.stdDev
    };
  }


  /**
    * @return {undefined|Object} - {ml: средняя, stdDev: отклонение}
    */
  stdDev( x, y ) {
    // Когда добавляем новую точку (x,y):
    //
    // Если нет точек совсем, добавим и вернемся.
    //
    // Данные актуальны, только если нет больших пустых промежутков.
    // Если таково выявляется, выбрасываем все предыдущие точки и добавляем
    // последнюю.
    //
    // Добавляем площадь последней трапеци и цену.
    //
    // Проверим, что период заполнен, иначе возвращаеся.
    //
    // Отнимаем цены и площади вначале очереди.
    //
    // Испольуем линейную интерполяцию чтобы считать площадь трапеции вначале.
    //
    //  x
    //  !
    //  !  p0           p3.....p3
    //  !  ! .        . !      ! .
    //  !  !  .     i   !      !  .
    //  !  !   .  . !   !      !   p4
    //  !  !    p1  !   !      !   !
    //  !  !    !   !   !      !   !
    // -!------------------------------ y
    //  !           ! -- period -- !
    //
    //
    // For example, when add p4,
    // add (p3y + p4y) / 2 * (p4x-p3x)
    // sub (p0y + p1y) / 2 * (p1x-p0x)
    // then interpolate i
    // sub (p1y + iy) / 2 * (ix - p1x)
    //


    // No points at all?
    if( this.points.empty() ) {
      this.points.push_back( x, y );
      return;
    }

    let lastInterval = x - this.points.backX();

    // Interval too large?
    if( lastInterval > this.resetInterval ) {
      // Reset and add last point as initial.
      this.sum = 0;
      this.points.clear();
      this.points.push_back( x, y );
      return;
    }

    // Add lastest trapezium square and point to deque.
    this.sum += (y + this.points.backY()) / 2.0 * lastInterval;
    this.points.push_back( x, y );

    // First period point x.
    let ix = x - this.length;

    // Not enough points for period?
    if( ix < this.points.frontX() )
      return;

    // Remove full trapeziums at front of deque
    // NOTE: while condition always false, if
    // bbPoints[1] is the last point and bbPeriod > 0.
    while( true ) {
      let {secondX, secondY} = this.points.getAt( 1, secondX, secondY );
      if( secondX > ix )
        break;

      this.sum -= (this.points.frontY() + secondY) / 2.0 *
        (secondX - this.points.frontX());
      this.points.pop_front();
    }

    // Need to interpolate?
    if( this.points.frontX() < ix ) {
      // Just cache variables
      let y1 = this.points.frontY();
      let x1 = this.points.frontX();
      let {secondX, secondY} = this.points.getAt( 1, secondX, secondY );

      let k = (y1 - secondY) / (x1 - secondX);
      let b = y1 - k * x1;

      let iy = k * ix + b;

      // sub trapezium from x1,y1 to ix, iy
      this.sum -= (y1 + iy) / 2.0 * (ix - x1);
      // remove first point and add interpolated point.
      this.points.change_front( ix, iy );
    }

    // Now, bbSum is exact square for bbPeriod
    // of line interpolated function in bbPoints.
    // We can count middle line point.
    let ml = bbSum / bbPeriod;

    // calc standard deviation
    let dispersion = bbPoints.linDispersion( ml );

    /*
  #ifdef __SSE2__
    dispersion = bbPoints.sse2Dispersion( ml );
  #else
    dispersion = bbPoints.fpDispersion( ml );
  #endif
    */

    // Could happens, due to float point errors.
    stdDev = sqrt( dispersion > 0 ? dispersion : 0 );

    return {ml: ml, stdDev: stdDev};
  }

}

module.exports = BB;
