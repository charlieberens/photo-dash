<script setup>
import { PlusCircleIcon, Trash2Icon } from "vue-feather-icons";
</script>

<script>
import axios from "axios";
export default {
  name: "DashboardPage",
  data() {
    return {
      selected: 0,
      albums: [],
      title: "",
      description: "",
    };
  },
  methods: {
    async submit(e) {
      e.preventDefault();
      const res = await axios.post("/api/albums?token=" + this.token, {
        title: this.title,
        description: this.description,
      });
      if (res.data.err) {
        alert(res.data.err);
      } else if (res.data.success) {
        alert(res.data.message);
        this.title = "";
        this.description = "";
        location.reload();
      }
    },
    async getAlbums() {
      const res = await axios.get("/api/albums?token=" + this.token);
      if (res.data.err) {
        alert(res.data.err);
        if (res.data.redirect) {
          window.location.href = res.data.redirect;
        }
      } else {
        this.albums = res.data.items.map((item) => ({
          uploading: [],
          failed: [],
          ...item,
        }));
      }
    },
    async del(photo) {
      if (confirm("You sure?")) {
        const params = {
          photo,
        };
        // Token doesn't work when encoded with URLSearchParams
        const res = await axios.delete(
          `/api/photos?token=${this.token}&album_id=${
            this.albums[this.selected].album_id
          }&${new URLSearchParams(params).toString()}`
        );
        if (res.data.err) {
          alert(res.data.err);
        } else if (res.data.success) {
          this.albums[this.selected].photos = this.albums[
            this.selected
          ].photos.filter((url) => url != photo);
        }
      }
    },
    async uploadImages() {
      const formData = new FormData();
      for (let i = 0; i < this.albums[this.selected].uploading.length; i++) {
        formData.append("photos", this.albums[this.selected].uploading[i].file);
      }

      const res = await axios({
        method: "POST",
        url: `/api/photos?album_id=${
          this.albums[this.selected].album_id
        }&token=${this.token}`,
        data: formData,
        headers: {
          enctype: "multipart/form-data",
        },
      });

      if (res.data.err) {
        alert(res.data.err);
      } else {
        const successes = res.data.return_arr
          .filter((item) => item.success)
          .map((item) => item.name);
        const locations = res.data.return_arr
          .filter((item) => item.success)
          .map((item) => item.location);
        const failures = res.data.return_arr
          .filter((item) => !item.success)
          .map((item) => item.name);

        this.albums[this.selected].photos =
          this.albums[this.selected].photos.concat(locations);

        this.albums[this.selected].failed = this.albums[
          this.selected
        ].failed.concat(
          this.albums[this.selected].uploading.filter((item) =>
            failures.includes(item.name)
          )
        );

        this.albums[this.selected].uploading = this.albums[
          this.selected
        ].uploading.filter(
          (item) =>
            !successes.includes(item.name) && !failures.includes(item.name)
        );
      }
    },
    onUploadFiles(event) {
      const files = [...event.target.files];
      files.forEach((file) => {
        //Avoid duplicates
        if (
          this.albums[this.selected].uploading.filter(
            (photo) => photo.name === file.name
          ).length === 0
        ) {
          this.albums[this.selected].uploading.push({
            url: URL.createObjectURL(file),
            name: file.name,
            file: file,
            location: "",
          });
        }
      });

      this.uploadImages();

      this.$refs.imgForm.reset();
    },
  },
  mounted() {
    const init = async () => {
      let token = window.location.search.split("=")[1];
      if (!token) {
        token = document.cookie.split("token=")[1];
      } else {
        document.cookie = "token=" + token;
        history.pushState({}, null, location.href.split("?")[0]);
      }
      this.token = token;
      const res = await axios.get("/api/dashboard?token=" + token);
      const data = res.data;
      if (data.valid) {
      } else {
        window.location.href = "/";
      }
      this.getAlbums();
    };
    init();
  },
};
</script>

<template>
  <div id="dashboard-page">
    <div id="dashboard-center">
      <h1>Dashboard</h1>
      <!-- <h2>Albums</h2> -->
      <div id="albums">
        <div
          :class="`album real-album${selected === index ? ' selected' : ''}`"
          v-for="(album, index) in albums"
          :key="index"
          @click="selected = index"
        >
          <span>{{ album.album_name }}</span>
        </div>
        <div
          :class="`add-album${selected === albums.length ? ' selected' : ''}`"
          @click="selected = albums.length"
        >
          <span class="add-album-span"
            ><i><PlusCircleIcon /></i
          ></span>
        </div>
      </div>
      <div id="dashboard-content-cont">
        <div id="album-info" v-if="selected < albums.length">
          <div id="album-instructions">
            <span
              ><strong>Note:</strong> By default, files with the same name will
              not overwrite eachother.</span
            >
            <span
              ><strong>Note:</strong> Recently uploaded photos cannot be
              deleted, reload the page to do so.</span
            >
            <span
              ><strong>Note:</strong> You can upload multiple files at once,
              either by selecting them or dropping them on the upload box.</span
            >
          </div>

          <h2>{{ albums[selected].album_name }}</h2>
          <div
            id="photos"
            v-if="
              selected < albums.length &&
              (albums[selected].photos ||
                albums[selected].uploading.length ||
                albums[selected].failed.length)
            "
          >
            <div
              class="photo-cont"
              v-for="photo in albums[selected].photos"
              :key="photo"
            >
              <span class="garbage" @click="del(photo)"><Trash2Icon /></span>
              <img class="photo" alt="" :src="photo" />
            </div>
            <img
              class="photo uploading"
              alt=""
              v-for="photo in albums[selected].uploading"
              :key="photo.url"
              :src="photo.url"
            />
            <img
              class="photo failed"
              alt=""
              v-for="photo in albums[selected].failed"
              :key="photo.url"
              :src="photo.url"
            />
            <!-- @click="uploading.splice(uploading.indexOf(photo), 1)" -->
          </div>
          <form id="photos-upload" ref="imgForm">
            <input
              type="file"
              name="file[]"
              multiple
              accept="image/jpeg, image/png"
              v-on:change="onUploadFiles"
            />
          </form>
        </div>
        <div id="add-album" v-else>
          <h3>Create New Album</h3>
          <form id="add-album-form" @submit="submit">
            <input
              class="add-album-input"
              type="text"
              placeholder="Album Title"
              v-model="title"
            />
            <textarea
              class="add-album-input"
              type="text"
              placeholder="Description"
              v-model="description"
            ></textarea>
            <button>Create Album</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
#dashboard-page {
  padding: 80px 40px;
  display: grid;
  place-items: center;
  min-height: 100vh;
}
#dashboard-center {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}
h1 {
  margin-bottom: 25px;
  text-align: center;
  width: 100%;
  font-size: 250%;
}
h2 {
  margin-bottom: 20px;
}
#albums {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 50px;
}
.album {
  height: 75px;
  width: 175px;
  font-size: 90%;
  display: grid;
  padding: 10px;
  place-items: center;
  border: 1px solid $grey-border;
  border-radius: 5px;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: 0.15s ease transform, 0.15s ease background-color,
    0.15s ease border-color, 0.15s ease opacity;
  opacity: 0.75;
  user-select: none;

  &:hover,
  &.selected {
    border-color: $text;
    opacity: 1;
  }
  &:hover {
    transform: translateY(-2px);
  }
}
.add-album {
  color: $primary-1;
  font-weight: 500;
  opacity: 1;
  cursor: pointer;
  transition: 0.15s ease color, 0.15s ease transform;

  &:hover {
    color: $primary-2;
    transform: translateY(-1px);
  }
}
.add-album-span {
  display: flex;
  align-items: center;
  column-gap: 6px;

  i {
    padding-top: 2px;
  }
}

#dashboard-content-cont {
}

#album-instructions {
  display: flex;
  flex-direction: column;
  row-gap: 3px;
  margin-bottom: 15px;
  opacity: 0.5;
}
#album-info {
  border-radius: 5px;
}
#photos {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  // padding: 20px;
  // border: 1px solid $grey-border;
  margin-bottom: 20px;
}
.photo-cont {
  position: relative;

  &:hover .garbage {
    opacity: 1;
    border-bottom-left-radius: 40px;
  }
}
.garbage {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: white;
  border-bottom-left-radius: 20px;
  opacity: 0;
  cursor: pointer;
  transition: 0.15s ease opacity, 0.15s ease border-bottom-left-radius;
  svg {
    width: 15px;
    position: absolute;
    top: 4px;
    right: 8px;
  }
  &:hover {
    color: red;
  }
}
.photo {
  aspect-ratio: 4/3;
  width: 100%;
  object-fit: cover;
  transition: 0.15s ease opacity;
  border-radius: 3px;

  &.uploading {
    opacity: 0.6;
    // cursor: pointer;
  }
  &.failed {
    opacity: 0.6;
    // cursor: pointer;

    border: 3px solid red;
  }
}
#photos-upload {
  width: 500px;
  input {
    padding: 25px;
    width: 100%;
    border-radius: 5px;
    // background: $offwhite;
    font-family: inherit;
  }
  border: 1px solid $grey-border;
}

#add-album {
  max-width: 500px;
  margin: 0 auto;

  h3 {
    margin-bottom: 20px;
  }
}
#add-album-form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  row-gap: 10px;

  button {
    margin-top: 10px;
  }
}
.add-album-input {
  width: 100%;
  padding: 14px 15px;
  border: 1px solid $grey-border;
  outline: none;
  font-size: 95%;
  border-radius: 0px;
  font-family: inherit;
  font-weight: inherit;

  &:focus {
    border-color: $text;
  }
}
textarea.add-album-input {
  min-height: 100px;
  max-width: 100%;
  min-width: 100%;
}
</style>
