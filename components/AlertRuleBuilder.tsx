"use client"
            </SelectTrigger>

            <SelectContent>

              <SelectItem value="price_above">
                Price Above
              </SelectItem>

              <SelectItem value="price_below">
                Price Below
              </SelectItem>

              <SelectItem value="volume_spike">
                Volume Spike
              </SelectItem>

              <SelectItem value="liquidation_spike">
                Liquidation Spike
              </SelectItem>

              <SelectItem value="oi_spike">
                OI Spike
              </SelectItem>

            </SelectContent>

          </Select>

          <Input
            type="number"
            value={value}
            onChange={(e) =>
              setValue(Number(e.target.value))
            }
          />

          <Select
            value={sound}
            onValueChange={setSound}
          >

            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>

              <SelectItem value="default">
                Default
              </SelectItem>

              <SelectItem value="absorption">
                Absorption
              </SelectItem>

              <SelectItem value="liquidation">
                Liquidation
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        <Button
          className="w-full"
          onClick={createRule}
        >
          Add Alert Rule
        </Button>

      </CardContent>

    </Card>

  )

}