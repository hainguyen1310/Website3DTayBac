// Sinh tự động bởi scripts/build-gift-models.mjs — không sửa tay.
export const GIFT_LAYOUT = {
  "products": {
    "bag-thit-trau": {
      "size": [
        15.647,
        2.871,
        23.036
      ]
    },
    "bag-ba-chi": {
      "size": [
        15.796,
        3.148,
        22.653
      ]
    },
    "bag-lap-xuong": {
      "size": [
        15.698,
        2.653,
        21.404
      ]
    },
    "bag-lon-say": {
      "size": [
        16.393,
        4.783,
        22.902
      ]
    },
    "jar-lon-xe": {
      "size": [
        9.026,
        9.071,
        17.364
      ]
    },
    "jar-cham-cheo": {
      "size": [
        9.167,
        9.188,
        4.729
      ]
    },
    "bottle-ruou-ngo": {
      "size": [
        12.356,
        12.518,
        15.069
      ]
    },
    "jar-trau-xe": {
      "size": [
        9.71,
        9.818,
        18.662
      ]
    }
  },
  "boxes": {
    "small": {
      "model": "box-small.glb",
      "bounds": {
        "min": [
          -23.854,
          0.028,
          -27.865
        ],
        "max": [
          22.262,
          44.056,
          10.121
        ]
      },
      "slots": {
        "bagA": {
          "x": -14.868,
          "z": -3.044,
          "floor": 1.413,
          "size": [
            16.393,
            4.783,
            23.437
          ]
        },
        "bagB": {
          "x": 2.599,
          "z": -3.115,
          "floor": 1.74,
          "size": [
            15.732,
            4.552,
            23.083
          ]
        },
        "jar": {
          "x": 16.791,
          "z": -5.798,
          "floor": 0.529,
          "size": [
            9.026,
            9.071,
            17.364
          ]
        },
        "cham": {
          "x": 16.832,
          "z": 6.857,
          "floor": 1.281,
          "size": [
            9.167,
            9.188,
            4.729
          ]
        }
      },
      "scale": 1
    },
    "large": {
      "model": "box-large.glb",
      "bounds": {
        "min": [
          -29.402,
          0.025,
          -26.57
        ],
        "max": [
          31.598,
          42.236,
          13.408
        ]
      },
      "slots": {
        "bagA": {
          "x": -20.307,
          "z": -0.248,
          "floor": 1.604,
          "size": [
            15.286,
            3.046,
            21.92
          ]
        },
        "bagB": {
          "x": -2.184,
          "z": -0.166,
          "floor": 1.708,
          "size": [
            15.034,
            2.996,
            21.56
          ]
        },
        "jar": {
          "x": 25.226,
          "z": -2.879,
          "floor": 0.614,
          "size": [
            9.71,
            9.818,
            18.662
          ]
        },
        "cham": {
          "x": 25.357,
          "z": 10.338,
          "floor": 0.534,
          "size": [
            9.365,
            9.382,
            4.824
          ]
        },
        "bottle": {
          "x": 13.387,
          "z": -0.61,
          "floor": 0.099,
          "size": [
            12.356,
            12.518,
            15.069
          ]
        }
      },
      "scale": 0.968
    }
  }
} as const;
