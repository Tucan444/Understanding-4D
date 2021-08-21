function rgb_to_hex(r, g, b) {
    r = Math.round(r).toString(16);
    g = Math.round(g).toString(16);
    b = Math.round(b).toString(16);

    if (r.length < 2) {
        r = "0" + r;
    }
    if (g.length < 2) {
        g = "0" + g;
    }
    if (b.length < 2) {
        b = "0" + b;
    }

    return `#${r}${g}${b}`;
}


class RotatingPoint2D {
    constructor(x, y, theta, magnitude, size, color) {
        this.x = x;
        this.y = y;
        // r as rotated
        this.rx = x;
        this.ry = y;
        this.theta = theta;
        this.magnitude = magnitude;
        this.size = size;
        this.color = color;
        this.shaded_color = [0, 0, 0];
        this.d = 0;

        this.linewidth = 4;
        this.offset = [400, 180];
        this.TAU = Math.PI * 2;
    }

    shade = function(light_x, light_y, light_intensity) {
        let differences = [this.rx - light_x, this.ry - light_y];
        let distance = Math.sqrt(Math.pow(differences[0], 2) + Math.pow(differences[1], 2));
        let alpha = Math.max(0, -(distance - light_intensity) / light_intensity);

        this.shaded_color = [this.color[0] * alpha, this.color[1] * alpha, this.color[2] * alpha];
    }

    rotate = function(alpha = 0) {
        let beta = alpha + this.theta;
        this.rx = Math.cos(beta) * this.magnitude;
        this.ry = Math.sin(beta) * this.magnitude;
    }

    find_d = function(player_pos) {
        let offseted_player_pos = [player_pos[0] - this.offset[0], player_pos[1] - this.offset[1]];

        let differences = [this.rx - offseted_player_pos[0], this.ry - offseted_player_pos[1]];

        this.d = Math.pow(differences[0], 2) + Math.pow(differences[1], 2);
    }

    draw_line_to_player = function(ctx, player_pos) {
        ctx.beginPath();
        ctx.strokeStyle = rgb_to_hex(this.shaded_color[0], this.shaded_color[1], this.shaded_color[2]);
        ctx.lineWidth = this.linewidth;

        ctx.moveTo(this.rx + this.offset[0], this.ry + this.offset[1])

        ctx.lineTo(player_pos[0], player_pos[1]);

        ctx.stroke();
    }

    blit = function(ctx) {
        ctx.beginPath();
        ctx.fillStyle = rgb_to_hex(this.shaded_color[0], this.shaded_color[1], this.shaded_color[2]);

        ctx.arc(this.rx + this.offset[0], this.ry + this.offset[1], this.size, 0, this.TAU);
        ctx.fill();
    }

    get_projected_positions = function(player_pos, projection_size, canvas_height) {
        let player_pos_x = player_pos[0] - this.offset[0];

        let projected_pos = this.ry * (projection_size[0] / (player_pos_x - this.rx)) * (canvas_height / projection_size[1]);

        return projected_pos + player_pos[1];
    }

}


class VerticalSliderPoint {
    constructor (x, y, r, colors, constrains) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.colors = colors;  // 0 for idle 1 for hover 2 for active
        this.constrains = constrains;

        this.TAU = Math.PI * 2;
    }

    set_y = function(y) {
        if (y < this.constrains[0]) {
            this.y = this.constrains[0];
        } else if (y > this.constrains[1]) {
            this.y = this.constrains[1];
        } else {
            this.y = y;
        }
    }

    collidepoint = function (x, y) {
        let differences = [this.x - x, this.y - y];
        let distance = Math.sqrt(Math.pow(differences[0], 2) + Math.pow(differences[1], 2));

        return (distance <= this.r);
    }

    get_progress = function() {
        let progress = this.y - this.constrains[0];
        progress /= this.constrains[1] - this.constrains[0];

        return progress;
    }

    blit = function(ctx, color_index) {
        ctx.beginPath();

        ctx.lineWidth = 1;
        ctx.fillStyle = this.colors[color_index];

        ctx.arc(this.x, this.y, this.r, 0, this.TAU);

        ctx.fill();
    }
}

console.log("a");
$(document).ready(function(){
    console.log("b");
    let c = $(".c")[0];
    let ctx = c.getContext("2d");
    let TAU = Math.PI * 2;
    let canvas_size = [1100, 360];
    let view_width = 120;
    let thin_line_width = 6;
    let normal_line_width = 20;
    let alpha = 0;
    let mousedown = false;
    let on_slider = false;

    let player_pos = [canvas_size[0] - 360, canvas_size[1] /2];
    let projection_size = [100, 120];

    let slider_padding_top_bottom = 40;
    let slider_angle = TAU * 1.2;

    let creamy_white = "#c3c3c3";
    let creamy_gray_light = "#a3a3a3"
    let creamy_gray = "#999999";
    let creamy_gray_dark = "#777777";
    let green = "#6de256";

    let sliderMode = 0;

    let sliderPoint = new VerticalSliderPoint(50, slider_padding_top_bottom, 16,
                                              [creamy_gray, creamy_gray_light, creamy_white],
                                              [slider_padding_top_bottom, canvas_size[1] - slider_padding_top_bottom]);

    let points = [new RotatingPoint2D(60, 0, 0, 60, 20, [255, 100, 100]),
                  new RotatingPoint2D(Math.cos((Math.PI / 3) * 2) * 80, Math.sin((Math.PI / 3) * 2) * 80, (Math.PI / 3) * 2, 80, 20, [255, 100, 100]),
                  new RotatingPoint2D(Math.cos((Math.PI / 3) * 4) * 110, Math.sin((Math.PI / 3) * 4) * 110, (Math.PI / 3) * 4, 110, 20, [255, 100, 100])];

    for (let i = 0; i < points.length; i++) {
        points[i].shade(100, 100, 400);
        points[i].find_d(player_pos);
        points[i].draw_line_to_player(ctx, player_pos);
    }

    points.sort((a, b) => (a.d < b.d) ? 1 : -1);

    draw_projected_view();

    draw_static_objects();

    sliderPoint.blit(ctx, 0);

    for(let i = 0; i<points.length; i++) {
        points[i].blit(ctx);
    }

    function draw_static_objects() {
        ctx.beginPath();
        
        ctx.strokeStyle = creamy_white;
        ctx.lineWidth = normal_line_width;

        ctx.moveTo(canvas_size[0] - view_width, 0);
        ctx.lineTo(canvas_size[0] - view_width, canvas_size[1])
        
        ctx.stroke();

        ctx.beginPath();
        
        ctx.strokeStyle = creamy_gray_dark;
        ctx.lineWidth = thin_line_width;

        ctx.moveTo(50, slider_padding_top_bottom);
        
        ctx.lineTo(50, canvas_size[1] - slider_padding_top_bottom);

        ctx.stroke();

        ctx.beginPath();

        ctx.strokeStyle = creamy_white;

        ctx.moveTo(player_pos[0], player_pos[1]);

        ctx.lineTo(player_pos[0] - projection_size[0], player_pos[1] - (projection_size[1] / 2));
        ctx.lineTo(player_pos[0] - projection_size[0], player_pos[1] + (projection_size[1] / 2));
        ctx.lineTo(player_pos[0], player_pos[1]);

        ctx.stroke();

        ctx.beginPath();

        ctx.fillStyle = green;
        ctx.arc(player_pos[0], player_pos[1], 20, 0, TAU);

        ctx.fill();

    }
    
    function draw_projected_view() {
        ctx.lineWidth = normal_line_width;

        for (var i = 0; i < points.length; ++i) {
            ctx.beginPath();
            ctx.strokeStyle = rgb_to_hex(points[i].shaded_color[0], points[i].shaded_color[1], points[i].shaded_color[2]);

            let projected_pos = points[i].get_projected_positions(player_pos, projection_size, canvas_size[1]);

            ctx.moveTo(canvas_size[0] - view_width, projected_pos);
            ctx.lineTo(canvas_size[0], projected_pos);

            ctx.stroke();
        }
    }

    function clear_canvas () {
        ctx.beginPath();

        ctx.fillStyle = "#282828";
        ctx.fillRect(0, 0, canvas_size[0], canvas_size[1]);
    }

    function draw_all () {
        clear_canvas();

        for (let i = 0; i < points.length; i++) {
            points[i].rotate(alpha);
            points[i].shade(100, 100, 400);
            points[i].find_d(player_pos);
            points[i].draw_line_to_player(ctx, player_pos);
        }

        points.sort((a, b) => (a.d < b.d) ? 1 : -1);

        draw_projected_view();

        draw_static_objects();

        sliderPoint.blit(ctx, sliderMode);
    
        for(let i = 0; i<points.length; i++) {
            points[i].blit(ctx);
        }
    }

    $(".c").mousemove(function(event){

        let mouse_pos = get_mouse_pos(event);

        if (mousedown && on_slider) {
            sliderMode = 2;
            sliderPoint.set_y(mouse_pos[1]);
            console.log(sliderPoint.y);
            alpha = slider_angle * sliderPoint.get_progress();
        } else if (sliderPoint.collidepoint(mouse_pos[0], mouse_pos[1])) {
            sliderMode = 1;
        } else {
            sliderMode = 0;
        }

        draw_all();
    });

    $(".c").mousedown(function(event){
        let mouse_pos = get_mouse_pos(event);

        mousedown = true;

        if (sliderPoint.collidepoint(mouse_pos[0], mouse_pos[1])) {
            on_slider = true;
            sliderMode = 2;

            draw_all();
        }
    });

    $("body").mouseup(function(event) {
        let mouse_pos = get_mouse_pos(event);
        mousedown = false;

        if (on_slider) {
            on_slider = false;
            sliderMode = 1 * sliderPoint.collidepoint(mouse_pos[0], mouse_pos[1]);
            draw_all();
        }
        
    });

    // other functions

    function get_mouse_pos(event) {
        let rect = c.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    }
    

});