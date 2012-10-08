// Global Constants
var SCHEDULE_INTERVAL = 1000; // milliseconds
var BATCH_SIZE = 20; // BATCH_SIZE
var DVD = 1;
var BLURAY = 2;
var IP = "http://rbxrank.aws.af.cm/"; // for local testing change it to http://127.0.0.1:8989/

function normalize(name)
{
    var decoded  = decodeURIComponent(name);
    var replaced = decoded.replace(/\(.*\)/,"");
    var trimmed = replaced.trim().toUpperCase();
    return trimmed;
}

function Range(start, end)
{
    this.start = start;
    this.end = end;
}

function Range()
{
    this.start = -1;
    this.end = -1;
}

function Movie(name, context)
{
    this.name = name;
    this.context = context;
}


function MovieHandler(target, movie)
{
    this.target = target;
    this.movie  = movie;
}

function MovieHandler(target, movie, callback)
{
    this.target = target;
    this.movie   = movie;
    this.callback = callback;
}

MovieHandler.prototype.setOrder = function(order)
{
    this.movie.context = order;
}

MovieHandler.prototype.getOrder = function()
{
    return this.movie.context;
}

MovieHandler.prototype.getUrl = function()
{
    return this.url;
}

MovieHandler.prototype.setUrl = function(url)
{
    this.url = url;
}

function updateMovie(c, a, url, obj)
{
    //console.log("critics_score is :" + c + " order:" + obj.getOrder() );
    if(c >0){
        $(obj.target).attr("cscore", c);
    }else{
        $(obj.target).attr("cscore", 0);
    }

    //console.log("audience_score is :" + a );
    if(a >0){
        $(obj.target).attr("ascore", a);
    }else{
        $(obj.target).attr("ascore", 0);
    }

    obj.setUrl(url);

    if(url){
        $(obj.target).attr("rlink", url);
    }
    if(obj.callback){
        obj.callback();
    }
}


function getRankings(movieHandler, onSuccess) {
    var name = movieHandler.movie.name;
    console.log("movie is :" + name);
    $.ajax({
        type: "GET",
        url: IP + "get",
        data: "id=" + name + "&access_token=B8CF722F917D" ,
        context: movieHandler,
        dataType: 'json', 
        success: onSuccess,
        error: function(jqXHR, textStatus, errorThrown){
                  console.log("textStatus:" + textStatus + " error:" + errorThrown);
        },
    });
}


function getRankings_n(movieHandlers, start, length, onSuccess) 
{
    var movies = new Array();
    var i = start; // to offset the boundary condition
    var lastIndex = start + length;
    while(i < movieHandlers.length && i < lastIndex ){
        var movie =  movieHandlers[i].movie;
        //console.log("Adding ["+ movie.name +"] in batch.");
        movies.push(movie);
        i++;
    }
    if(movies.length == 0){
        //console.log("No movies to get ranking.");
        return;
    }

    var cx = new Range();
    cx.start = start;
    cx.end   = start + movies.length;
    // create the http payload
    var payload = new Object();
    payload.ids = movies;
    var dPayload = JSON.stringify(payload);
    //console.log("Payload is :" + dPayload);

    // make an ajax call
    $.ajax({
        type: "POST",
        url: IP + "get?access_token=B8CF722F917D",
        data: dPayload,
        context: cx,
        dataType: 'json', 
        contentType: "application/json",
        success: onSuccess,
        error: function(jqXHR, textStatus, errorThrown){
                  //console.log("textStatus:" + textStatus + " error:" + errorThrown);
        },
    });
}

function responseHandler(ratings)
{
    updateMovie(ratings.critics_score, ratings.audience_score, ratings.rlink, this);
}

// Ajax success callback. Each of the element in the ratingsArray is 
// ratings{_id, critics_ratings, audience_ratings, rlink, context}
// *this* is Range added as the context params  to Ajax call
function responseHandler_n(ratingsArray)
{
    //console.log("Response:" + JSON.stringify(ratingsArray));
    // update the progress bar
    var pc = parseInt((this.end/totalMovies) * 100);
    console.log("end:" + this.end + " pc:" + pc);
    $("#rbxrank_progress").css('width',pc+'%');
    if(pc >=100){
        setTimeout(function() {
            var obj = $(".rbxrank_busy");
            var p   = $(obj).parent();
            $(obj).remove();
            var obj = $(p).append("<div class='options_bar rbxrank_busy'><div class='containerwrapper'>" + 
                "<div id='sort_button' class='action_button'>Click to Sort Movies by Tomatoes</div>" +
                "<div id='reset_button' class='action_button'>Click to Refresh Ratings</div>" +
                "</div></div>");
            $('#sort_button', obj).click( function(){
                console.log("Sorting movies");
                sortMoviesByRanking();
            });
            $('#reset_button', obj).click( function(){
                console.log("Reloading");
                sortMoviesByOrder();
                //window.location.reload(false); 
            });

        }, 2000);
    }

    if(ratingsArray != null){
        for(var i=0; i<ratingsArray.length; i++){
            var ratings = ratingsArray[i];
            //console.log("Looking up movie :" + ratings._id 
                    //+ " in start:" + this.start 
                    //+ " end  :" + this.end)
            var index = ratings.context;
            if(index < this.start || index > this.end){
                //console.log("Invalid index: " + index);
            }
            updateMovie(ratings.critics_score, ratings.audience_score, ratings.rlink, movieHandlers[index]);
            displayRanking_1(index);
        }
    }
}

function findRanking(movieHandler)
{
    try{
        getRankings(movieHandler, responseHandler);
    }catch(err){
        //console.log("Exception:" + err);
    }
}

function findRanking_n(movieHandlers, start, length)
{
    try{
        getRankings_n(movieHandlers, start, length,  responseHandler_n);
    }catch(err){
        console.log("Exception:" + err);
    }
}

function displayRanking(p, obj, selector, cscoreOnly, displayNonRated,  rottenC, freshC, rottenA, freshA)
{
    if(obj != p){
        //p.prepend(obj); 
    }
    var c = $(obj).attr("cscore");
    var a = $(obj).attr("ascore");
    //console.log("cscore [%d] and ascore[%d] for movie[%s]", c, a, $(obj).attr('name'));
    if(c >= 1 && c <=60){
        $(selector, p).append(rottenC.replace("{SCORE}", c)); 
    }else if( c > 60 ){
        $(selector, p).append(freshC.replace("{SCORE}", c));
    }else{
        if(displayNonRated == true){ 
            $(selector, p).append("<span class='ratings'>No ratings yet.</span>");
        }

    }
    if(cscoreOnly == false){
        if(a >= 1 && a <=60){
            $(selector, p).append(rottenA.replace("{SCORE}", a)); 
        }else if( a > 60 ){
            $(selector, p).append(freshA.replace("{SCORE}", a)); 
        }else{
            if(displayNonRated == true){ 
                $(selector, p).append("<span class='ratings'>No ratings yet.</span>");
            }
        }
    }
}


function displayRanking_1(i)
{
        //console.log("displaying ranking for index:" + i);
        var obj = movieHandlers[i].target;
        var p = $(obj).parent();
        $(obj).append("<div class='rbxrank_elem' id='rbxrank_"+ i+ "'/>");
        $("#rbxrank_" + i).click(function(){
                var url = $(obj).attr("rlink");
                if(url){
                window.open(url, null, "width=500, height=500, top=0");
                }

        });

        displayRanking(p, obj, "#rbxrank_"+ i, true, false,
                "<span class='icon tiny rotten'>&nbsp;</span><span class='rbxrank_small_text'>{SCORE}</span><span class='rbxrank_small_pc'>%</span>", 
                "<span class='icon tiny fresh'>&nbsp;</span><span class='rbxrank_small_text'>{SCORE}</span><span class='rbxrank_small_pc'>%</span>");
}


function sortMoviesByOrder()
{
    if(movieHandlers.length < 1){
        //console.log("unable to find movies");
        return;
    }
    //console.log("Sorting " + listitems.length + " movies");
    var listitems = $(movieHandlers);
    var p = $(movieHandlers[0].target).parent();
    listitems.sort(function(a, b) {
               return b.getOrder() - a.getOrder();
    });
    $.each(listitems, function(i, obj) { 
            if(p != obj.target){
                p.prepend(obj.target);
            }
    });
    console.log("Done sorting by order.");
}
function sortMoviesByRanking()
{
    var listitems = $('div[cscore]');
    if(listitems.length < 1){
        //console.log("unable to find movies");
        return;
    }
    //console.log("Sorting " + listitems.length + " movies");
    var p = $(listitems[0]).parent();
    listitems.sort(function(a, b) {
               return $(a).attr("cscore") - $(b).attr("cscore");
               });
    $.each(listitems, function(i, obj) { 
            if(p != obj){
                p.prepend(obj);
            }
    });
    console.log("Done sorting by ranking");
}

function schedule()
{
    //console.log("Querying start index[" + movieHandlers.queryCounter + "]");
    findRanking_n(movieHandlers, movieHandlers.queryCounter, BATCH_SIZE);
    movieHandlers.queryCounter += BATCH_SIZE;
    if(movieHandlers.queryCounter < movieHandlers.length){
        setTimeout(schedule, SCHEDULE_INTERVAL);
    }
}

function displayRankingCallback()
{
    var obj = this.target;
    var url = this.getUrl();
    var p = $(obj).parent();
    $(".rbxrank_group").click(function(){
            window.open(url,null, "width=500, height=500, top=0");
    });
    displayRanking(p, obj, ".rbxrank_group",  false, true, 
            "<div class='ratings'><div class='icon rotten_tomato'></div><div class='rbxrank_text'>{SCORE}</div><span class='rbxrank_pc'>%</span></div>", 
            "<div class='ratings'><div class='icon fresh_tomato'></div><div class='rbxrank_text'>{SCORE}</div><span class='rbxrank_pc'>%</span></div>", 
            "<div class='ratings'><div class='icon rotten_bucket'></div><div class='rbxrank_text'>{SCORE}</div><span class='rbxrank_pc'>%</span></div>", 
            "<div class='ratings'><div class='icon fresh_bucket'></div><div class='rbxrank_text'>{SCORE}</div><span class='rbxrank_pc'>%</span></div>");
}
function normalize_urlmovie(name){
    var name1 = name.replace(new RegExp("-blu-ray"), "");
    var name2 = name1.replace(/\-/g, " ");
    return name2;
}
var movieHandlers = new Array();
movieHandlers.queryCounter = 0;
var totalMovies = 0;

function buildMovieHandlers(matchClass, context)
{
    movieHandlers.queryCounter = 0;
    movieHandlers.splice(0);
    console.log("buildMovieHandlers");
    $("." + matchClass, context).each( function(index, obj){
            var name = $(obj).attr('name');
            //check if the movie is out-of-box 
            var skip = false;
            $.each( $(obj).find('img'), function(i, img){
                //console.log($(img).attr("src"));
                if( $(img).attr("src").indexOf("label_out") != -1){
                    //console.log("Encountered movie [%s] with label_out", name);
                    skip = true;
                }
            });
            if( skip == false){
                var nname = normalize(name);
                var movieObj = new Movie(nname, movieHandlers.length);
                var movieHandler = new MovieHandler(obj, movieObj);
                movieHandlers.push(movieHandler);
                console.log("Found movie:" + nname);
            }
    });
    console.log("buildMovieHandlers found movie:"+ movieHandlers.length);
}

// XXX - main execution starts here 
function main()
{
    var path = window.location.pathname;
    var elems = path.split("/");
    console.log("path: " + path + " split:" + elems.length);
    if(elems.length == 3){
        //on a movie page 
        var heading  = $("h1[itemprop=name]");
        if(heading){
            var name = $(heading).text();
            var nname = normalize(name);
            //console.log("name of the movie:"+ nname);
            if(nname){
                var obj  = heading;
                if(obj == null){
                    //console.log("null item");
                    return;
                }
                var target = $(obj).parent();
                $("<div class='rbxrank_group'/>").insertAfter(target);
                var movie = new Movie(nname, 0);
                var movieHandler = new MovieHandler(target, movie, displayRankingCallback);
                findRanking(movieHandler);
            }
        }
    }
    else{
        buildMovieHandlers("box-wrapper", document);
        $.each($("div[class=sp-inline-header]"), function(i, obj){
                $(obj).on("mouseup", function() {
                    // requery in background
                    setTimeout( function(){
                        buildMovieHandlers("box-wrapper", document);
                        totalMovies = movieHandlers.length;
                        setTimeout(schedule, SCHEDULE_INTERVAL);
                    }, 3000);
                    });
                 return;
        });
        //console.log("scheduling timer 1 sec movies found:" + movieHandlers.queryCounter);

        $(".filter-container").append("<div class='rbxrank_busy redbg stripes'> " + 
           "<div class='rbxrank_text_abs'>Picking fresh tomatoes for you....</div>" + 
           "<span id='rbxrank_progress' class='rbxrank_bar'></span>" + 
          "</div>");

        totalMovies = movieHandlers.length;
        setTimeout(schedule, SCHEDULE_INTERVAL);
    }
}main();
