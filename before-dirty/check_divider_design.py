import sys

def check_divider_design( dividend, divider, width ):
  assert( dividend < (1<<width) )
  assert( divider< (1<<width) )
  remains = []
  remains.append( dividend )
  result_bit = []
  for what in range(width-1,-1,-1):
    # compare
    cmp = 1 if (divider << what) <= remains[-1] else 0
    r = remains[-1] - (divider << what)*cmp
    result_bit.append(cmp)
    remains.append(r)

  result_bit.reverse()
  base = 1
  dec_result = 0
  for i in result_bit:
    dec_result += i * base
    base *= 2

  return result_bit, dec_result

if __name__ == "__main__":
  print( check_divider_design( 1, 0, 32 ) )
  for width in range(1,15 ):
    print( "checking width", width )
    r = 1<<width
    print( "checking", (1<<width<<width), "relations" )
    for dividend in range(0,r):
      for divider in range(1,r):
        _, a = check_divider_design( dividend, divider, width )
        assert( a == dividend // divider )

  print( "all good" )
