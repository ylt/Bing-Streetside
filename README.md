# Bing-Streetside

A library to fetch the "Street Side" image tiles from Bing Maps. This uses reverse engineered API's.

## API:

### Bing:
Constructing the bing class retrieves the settings + default options.
These include the API key, "generation id" along with default settings such as the bubble count

Available methods on this are:
#### getBubble(id)
This returns a Bubble object

#### getBubbles({opts})
The available options are:
  - count
  - box
    - north (latitude)
    - south (latidude)
    - east (longitude)
    - west (longitude)
  - center
    - lat
    - lng
    - radius (in meters)

This returns a list of Bubble objects.

May also add in support for geohashes, along with other bounding box formats.

### Bubble:
This object represents a "bubble" on Bing, this is 360 sphere.

The sphere consists of an image for each side (front, right, back, left, top, bottom.

Enums:
#### side
 - FRONT
 - RIGHT
 - BACK
 - LEFT
 - TOP
 - BOTTOM

The available methods on this are:
#### tileToIndex(x, y, detail)
Converts an x,y coordinate index to a quadtree hash, with the specified number of bits (`detail`)

#### fetchXY(side, detail, x, y)
Fetches the tile, returns a Buffer object containing jpeg data.

#### fetchSide(side, detail)
Fetches an entire side, this fetches them in parallel, although uses a request pool of 16, spread over 2 domains -
this approximately matches browser behaviour.
The level of detail exponentially increases the number of tiles needing to be fetched.
For each value of detail, the number of tiles needed quadruples:
 - 0: 1 request (254x254px)
 - 1: 4 requests (508x508px)
 - 2: 16 requests (1016x1016px)
 - 3: 64 requests (2032x2032px)


## Example:
```javascript
new Bing().then(bing => {
  return bing.getBubble(146511614);
}).then(bubble => {
  return bubble.getSide(Bing.Bubble.side.FRONT, 2);
}).then(canvas => {
  let buffer = canvas.toBuffer();
  fs.writeFile(__dirname+'/result.png', buffer);
});
```

## Future Work
Still a fair few breaking changes to be done.

### Bing
 - caching for the returned info.
 - returning a promise in a constructor seems a little dodgy. May change this to lazy load,
 wait for the internal promise within the getBubble and getBubbles methods.


#### fetchSide
 - Return type needs changing to be a buffer directly, although this isn't ideal for converting it's more consistant.
 - May allow retrieving an area by percentage along with how many pixels to render into - do automatic selection of detail based on this.
 - May allow specifying an angle rather than a side. 0 degrees being front, 45 degrees being halfway between front and right, etc.
 Just tricky in terms of how to handle up/down.
 - May be interesting allowing returning angles relative to north. 
 
#### fetchSphere
 - return a full 360 degree sphere. This however needs projecting to polar.
 Maybe we should return an object containing each side individually, with a toPolar() method.
