'use strict'

class FPD {
  /**
    * @constructor Растущий по необходимости кольцевой буффер,
    *              считающий дисперсию по мере добавления и удаления значений.
    */
  constructor(capInc = 4096) {
    this.capacityIncrement = capInc;
    this.capacity = capInc * 2;
    this.vx = new Float64Array(this.capacity);
    this.vy = new Float64Array(this.capacity);

    this.clear();
  }

  frontX() { return this.vx[ this.head ]; }
  frontY() { return this.vy[ this.head ]; }

  backX() {
    return this.tail ? this.vx[ this.tail-1 ] : this.vx[ this.capacity-1 ];
  }

  backY() {
    return this.tail ? this.vy[ this.tail-1 ] : this.vy[ this.capacity-1 ];
  }

  empty() { return this.tail == this.head; }

  size() {
    if( this.tail < this.head )
      return this.capacity - this.head + this.tail;
    else
      return this.tail - this.head;
  }

  getAt(i)
  {
    let ri = (this.head + i) % this.capacity;
    return { x: this.vx[ ri ], y: this.vy[ ri ] };
  }

  change_front( x, y )
  {
    // update dispersion sums
    let hy = this.vy[ this.head ];
    this.ss = this.ss - hy * hy + y * y;
    this.s = this.s - hy + y;

    // update first elementh
    this.vx[ this.head ] = x;
    this.vy[ this.head ] = y;
  }


  pop_front() {
    // Update dispersion sums
    let y = this.vy[ this.head ];
    this.ss -= y * y;
    this.s -= y;

    // Remove head.
    this.head++;
    if( this.head == this.capacity )
      this.head = 0;
  }


  push_back( x, y ) {
    // Update dispersion sums
    this.ss += y * y;
    this.s += y;

    this.vx[this.tail] = x;
    this.vy[this.tail] = y;

    this.tail++;

    // end of buffer?
    if( this.tail == this.capacity )
      this.addWithoutRebalance();

    // end of room?
    if( this.tail == this.head )
      this.addAndRebalance();
  }


  addWithoutRebalance()
  {
    // Есть свободного места больше, чем this.capacityIncrement?
    if( this.head > this.capacityIncrement ) {
      // Начнем заполнять свободное место вначале...
      this.tail = 0;
      return;
    }

    // Добавим байтиков..
    this.capacity += this.capacityIncrement;

    let nvx = new Float64Array(this.capacity);
    for(let i = 0; i < this.vx.length; i++) {
      nvx[i] = this.vx[i];
    }
    this.vx = nvx;

    let nvy = new Float64Array(this.capacity);
    for(let i = 0; i < this.vy.length; i++) {
      nvy[i] = this.vy[i];
    }
    this.vy = nvy;
  }


  addAndRebalance() {
    let newCapacity = this.capacity + this.capacityIncrement;

    let nvx = new Float64Array(newCapacity);
    let nvy = new Float64Array(newCapacity);

    // Правая часть переезжает правее на capacityIncrement
    let dst = newCapacity - 1;
    let src = dst - this.capacityIncrement;
    let first = this.head - 1;
    do {
      nvx[dst] = this.vx[src];
      nvy[dst] = this.vy[src]
      dst--;
      src--;
    } while( src != first );

    this.capacity = newCapacity;
    this.head += this.capacityIncrement;

    // Левая часть копируется как есть
    for(let i = 0; i < this.tail; i++) {
      nvx[i] = this.vx[i];
      nvy[i] = this.vy[i];
    }

    this.vx = nvx;
    this.vy = nvy;
  }


  clear() {
    this.head = 0;
    this.tail = 0;

    this.ss = 0;
    this.s = 0;
  }


  fpDispersion( ml ) {
    let s = 0;
    if( this.tail > this.head ) {
      for(let  i = this.head; i < this.tail; i++) {
        let diff = this.vy[i] - ml;
        s += diff * diff;
      }
    }
    else {
      for( i = 0; i < this.tail; i++ ) {
        let diff = this.vy[i] - ml;
        s += diff * diff;
      }

      for( i = this.head; i < this.capacity; i++ ) {
        let diff = this.vy[i] - ml;
        s += diff * diff;
      }
    }

    return s / (size() - 1);
  }


  linDispersion( ml )
  {
    let n = this.size();
    return (ss - 2*ml*s + n * ml * ml) / (n - 1);
  }
};

module.exports = FPD;
