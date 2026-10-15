package repository

import "testing"

// Regression guard: rates below 0.05/s used to round to 0, so a lightly loaded
// but active instance reported "0.0 QPS" and was classified as idle.
func TestRoundRateKeepsLowRateTraffic(t *testing.T) {
	cases := []struct {
		name string
		in   float64
		want float64
	}{
		{"idle", 0, 0},
		{"one request per minute", 1.0 / 60.0, 0.017},
		{"two requests per minute", 2.0 / 60.0, 0.033},
		{"four requests per five minutes", 4.0 / 300.0, 0.013},
		{"high rate keeps three decimals", 12.3456, 12.346},
		{"thousands of requests per second", 1234.5678, 1234.568},
	}

	for _, tc := range cases {
		if got := roundRate(tc.in); got != tc.want {
			t.Errorf("%s: roundRate(%v) = %v, want %v", tc.name, tc.in, got, tc.want)
		}
	}
}
