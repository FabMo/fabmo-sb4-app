/**
 * Update UI elements on the page from the engine's opensbp
  configuration.
 * Takes any element with an id of the form branchname-configitem_name that corresponds to a configuration item:
 * eg: opensbp-movexy_speed, opensbp-jogxy_speed
 * and populates it from the corresponding value in the opensbp configuration, read from the engine.
 */
function updateUIFromEngineConfig() {
    fabmoDashboard.getConfig(function(err, data) {
      if(err) {
        console.error(err);
      } else {
        for(key in data.opensbp) {
          v = branch[key];
          input = $('#opensbp-' + key);
          if(input.length) {
            input.val(String(v));
          }
        }
      }
    });
}

/**
 * Set the specified value in the engine's configuration
 * id is of the form opensbp-configitem_name such as opensbp-movexy_speed, etc.
 * This will only work for configuration items on the first branch of the tree - 
 * deeper items need more consideration.
 */
function setConfig(id, value) {
	var parts = id.split("-");
	var o = {};
	var co = o;
	var i=0;

	do {
	  co[parts[i]] = {};
	  if(i < parts.length-1) {
	    co = co[parts[i]];            
	  }
	} while(i++ < parts.length-1 );

	co[parts[parts.length-1]] = value;
	  console.log(o);
    fabmoDashboard.setConfig(o, function(err, data) {
	  update();
	});
}
