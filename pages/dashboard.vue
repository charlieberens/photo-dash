<script setup>
import { PlusCircleIcon } from "vue-feather-icons";
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
      } else if (res.data.success) {
        this.albums = res.data.items.map((item) => ({
          uploading: [],
          uploaded: [],
          failed: [],
          ...item,
        }));
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
      } else if (res.data.successes) {
        const successes = res.data.successes
          .filter((item) => item.success)
          .map((item) => item.name);
        const failures = res.data.successes
          .filter((item) => !item.success)
          .map((item) => item.name);
        this.albums[this.selected].uploaded = this.albums[
          this.selected
        ].uploaded.concat(
          this.albums[this.selected].uploading.filter((item) =>
            successes.includes(item.name)
          )
        );
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
          @click="
            selected = albums[selected].uploading.length ? selected : index
          "
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
          <h2>{{ albums[selected].album_name }}</h2>
          <div
            id="photos"
            v-if="
              albums[selected].photos ||
              albums[selected].uploaded.length ||
              albums[selected].uploading.length ||
              albums[selected].failed.length
            "
          >
            <img
              class="photo"
              alt=""
              v-for="photo in albums[selected].photos"
              :key="photo"
              :src="photo"
            />
            <img
              class="photo uploaded"
              alt=""
              v-for="photo in albums[selected].uploaded"
              :key="photo"
              :src="photo.url"
            />
            <img
              class="photo uploading"
              alt=""
              v-for="photo in albums[selected].uploading"
              :key="photo"
              :src="photo.url"
            />
            <img
              class="photo failed"
              alt=""
              v-for="photo in albums[selected].failed"
              :key="photo"
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
.photo {
  aspect-ratio: 4/3;
  width: 100%;
  object-fit: cover;
  transform: 0.15s ease opacity;
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
