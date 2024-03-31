---
title: Уга буга < 100
layout: post
---

# уга буга

```rust
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{BufWriter, Write};

type Palette = BTreeMap<u16, Color>;
type Func = dyn Fn(Point) -> f32;

struct Point(f32, f32);
struct Color(u8, u8, u8);

struct Generator {
    size: (u32, u32),
    x: (f32, f32),
    y: (f32, f32),
}

struct Render {
    raw: Vec<f32>,
    size: (u32, u32),
}

impl Generator {
    fn fill(&self, func: &Func) -> Render {
        let iterations = (self.size.0 * self.size.1) as usize;
        let x_step = (self.x.1 - self.x.0) / self.size.0 as f32;
        let y_step = (self.y.1 - self.y.0) / self.size.1 as f32;
        let mut result = Render { raw: vec![0.0; iterations], size: self.size };
        let (mut minv, mut maxv) = (None, None);

        for (index, value) in result.raw.iter_mut().enumerate() {
            let ix = (index as u32 % self.size.0) as f32;
            let iy = (index as u32 / self.size.0) as f32;
            *value = func(Point(self.x.0 + ix * x_step, self.y.0 + iy * y_step));
            minv = Some(minv.map_or(*value, |item: f32| item.min(*value)));
            maxv = Some(maxv.map_or(*value, |item: f32| item.max(*value)));
        }

        let minv = minv.unwrap_or(0.0).abs();
        let range = minv + maxv.unwrap_or(0.0).abs();
        for value in result.raw.iter_mut() {
            *value = (*value + minv) / range;
        }

        result
    }
}

fn linear_gradient_palette(c1: Color, c2: Color, n: u16) -> Palette {
    let mut map = Palette::new();

    for i in 0..n {
        let t = i as f32 / n as f32;
        let r = ((1.0 - t) * c1.0 as f32 + t * c2.0 as f32) as u8;
        let g = ((1.0 - t) * c1.1 as f32 + t * c2.1 as f32) as u8;
        let b = ((1.0 - t) * c1.2 as f32 + t * c2.2 as f32) as u8;
        map.insert(i, Color(r, g, b));
    }

    map
}

fn generate_ppm(output: &str, render: &Render, palette: &Palette) {
    let mut buffer = Vec::new();
    let _ = write!(buffer, "P6\n{} {}\n255\n", render.size.0, render.size.1);

    for point in &render.raw {
        let index = ((palette.len() - 1) as f32 * (*point)) as u16;
        let color = palette.get(&index).unwrap_or(&Color(0, 0, 0));
        buffer.extend_from_slice(&[color.0, color.1, color.2]);
    }

    let mut f = BufWriter::new(File::create(output).unwrap());
    let _ = f.write(&buffer);
}

fn render(point: Point) -> f32 {
    let (mut x, mut y, mut iter): (f32, f32, _) = (0.0, 0.0, 0);

    while x.powi(2) + y.powi(2) < 4.0 && iter < 20 {
        let xt = x.powi(2) - y.powi(2) + point.0;
        y = 2.0 * x * y + point.1;
        x = xt;
        iter += 1;
    }

    iter as f32
}

fn main() {
    let palette = linear_gradient_palette(Color(0, 0, 0), Color(255, 255, 255), 255);
    let result = Generator { size: (3840, 2160), x: (-2.2, 1.0), y: (-1.2, 1.2) }.fill(&render);
    generate_ppm("mandelbrot_set.ppm", &result, &palette);
}
```

# уга буга!
![unga-bunga](/assets/posts/mandelbrot_set.jpg "unga bunga")

# уга буга
- [уга буга][unga-bunga]

[unga-bunga]: https://github.com/FreeCX/abstracto
